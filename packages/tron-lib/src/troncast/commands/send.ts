import { defineCommand } from 'citty'
import { consola } from 'consola'

import { getPrivateKey } from '../../utils/envHelpers'
import { loadForgeArtifact } from '../../helpers/loadForgeArtifact'
import type { Environment, ITransactionReceipt } from '../types'
import { formatGasUsage, formatReceipt } from '../utils/formatter'
import {
  isValidAddress,
  parseArgument,
  parseFunctionSignature,
} from '../utils/parser'
import { initTronWeb, parseValue, waitForConfirmation } from '../utils/tronweb'

export const sendCommand = defineCommand({
  meta: {
    name: 'send',
    description: 'Send a transaction to a Tron contract',
  },
  args: {
    address: {
      type: 'positional',
      description: 'Contract address',
      required: true,
    },
    signature: {
      type: 'positional',
      description: 'Function signature (e.g., "transfer(address,uint256)")',
      required: false,
    },
    params: {
      type: 'positional',
      description: 'Function parameters',
      required: false,
    },
    env: {
      type: 'string',
      description: 'Environment (mainnet or testnet)',
      default: 'mainnet',
    },
    privateKey: {
      type: 'string',
      description: 'Private key for signing (defaults to PRIVATE_KEY env var)',
    },
    value: {
      type: 'string',
      description: 'TRX value to send (e.g., "0.1tron", "100000sun")',
    },
    feeLimit: {
      type: 'string',
      description: 'Maximum fee in TRX',
      default: '1000',
    },
    confirm: {
      type: 'boolean',
      description: 'Wait for confirmation',
      default: true,
    },
    dryRun: {
      type: 'boolean',
      description: 'Simulate without sending',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
    rpcUrl: {
      type: 'string',
      description: 'Custom RPC URL (overrides environment variable)',
    },
    calldata: {
      type: 'string',
      description: 'Raw calldata (hex string with 0x prefix)',
    },
  },
  async run({ args }) {
    try {
      if (!isValidAddress(args.address))
        throw new Error(`Invalid contract address: ${args.address}`)

      const env = args.env as Environment
      if (env !== 'mainnet' && env !== 'testnet')
        throw new Error('Environment must be "mainnet" or "testnet"')

      const privateKey = args.privateKey || getPrivateKey()

      const tronWeb = initTronWeb(env, privateKey, args.rpcUrl)

      if (!args.signature && !args.calldata) {
        throw new Error(
          'Either function signature or --calldata must be provided'
        )
      }

      // Raw calldata path
      if (args.calldata) {
        consola.info(`Sending raw calldata transaction to ${args.address}`)

        if (!args.calldata.startsWith('0x'))
          throw new Error('Calldata must start with 0x')

        const data = args.calldata.slice(2)
        const callerAddress = tronWeb.address.fromPrivateKey(privateKey)
        if (!callerAddress)
          throw new Error('Failed to derive address from private key')

        const contractAddressHex = tronWeb.address.toHex(args.address)
        const ownerAddressHex = tronWeb.address.toHex(callerAddress)

        const triggerResult = (await tronWeb.fullNode.request(
          'wallet/triggersmartcontract',
          {
            owner_address: ownerAddressHex,
            contract_address: contractAddressHex,
            data,
            fee_limit: args.feeLimit
              ? parseInt(
                  tronWeb.toSun(parseFloat(args.feeLimit as string)) as string
                )
              : 1000000000,
            call_value: 0,
          },
          'post'
        )) as { result?: { result?: boolean }; transaction?: unknown }

        if (!triggerResult?.result?.result)
          throw new Error(
            `Failed to trigger contract: ${JSON.stringify(triggerResult)}`
          )

        const transaction = triggerResult.transaction
        if (!transaction) throw new Error('No transaction in trigger result')

        if (args.dryRun) {
          consola.info('Dry run - transaction not sent')
          consola.log(JSON.stringify(transaction, null, 2))
          return
        }

        const signedTransaction = (await tronWeb.trx.sign(
          transaction as Parameters<typeof tronWeb.trx.sign>[0],
          privateKey
        )) as Awaited<ReturnType<typeof tronWeb.trx.sign>>

        const result = await tronWeb.trx.sendRawTransaction(
          signedTransaction as Parameters<
            typeof tronWeb.trx.sendRawTransaction
          >[0]
        )

        if (!result.result)
          throw new Error(`Transaction send failed: ${JSON.stringify(result)}`)

        const txId = result.txid || result.transaction?.txID
        if (!txId) throw new Error('Transaction ID not found')

        consola.success(`Transaction sent: ${txId}`)

        if (args.confirm) {
          consola.info('Waiting for confirmation...')
          const receipt = (await waitForConfirmation(
            tronWeb,
            txId
          )) as ITransactionReceipt

          if (args.json) consola.log(JSON.stringify(receipt, null, 2))
          else consola.log(formatReceipt(receipt))

          if (receipt.result === 'FAILED')
            throw new Error(
              `Transaction failed: ${receipt.resMessage || 'Unknown error'}`
            )
        }
        return
      }

      // Function signature + parameters path
      const funcSig = parseFunctionSignature(args.signature!)
      consola.info(`Preparing to call ${funcSig.name} on ${args.address}`)

      let params: string[] = []
      if (args.params) {
        const paramsStr = args.params.trim()
        const hasArrayParam = funcSig.inputs.some((input) =>
          input.type.endsWith('[]')
        )

        if (hasArrayParam) {
          const parsed: string[] = []
          let currentPos = 0
          let bracketDepth = 0

          for (let i = 0; i < paramsStr.length; i++) {
            const char = paramsStr[i]
            if (char === '[') bracketDepth++
            else if (char === ']') bracketDepth--

            if (char === ',' && bracketDepth === 0) {
              const param = paramsStr.slice(currentPos, i).trim()
              if (param) parsed.push(param)
              currentPos = i + 1
            }
          }

          if (currentPos < paramsStr.length) {
            const param = paramsStr.slice(currentPos).trim()
            if (param) parsed.push(param)
          }

          params = parsed.length > 0 ? parsed : [paramsStr]
        } else {
          params = paramsStr.split(',').map((p) => p.trim())
        }
      }

      if (params.length !== funcSig.inputs.length)
        throw new Error(
          `Expected ${funcSig.inputs.length} parameters, got ${params.length}`
        )

      const parsedParams = params.map((param, i) =>
        parseArgument(funcSig.inputs[i]?.type || 'string', param)
      )

      const feeLimitInSun = tronWeb.toSun(parseFloat(args.feeLimit as string))
      const options: Record<string, unknown> = {
        feeLimit:
          typeof feeLimitInSun === 'string'
            ? parseInt(feeLimitInSun)
            : Number(feeLimitInSun),
      }

      if (args.value) {
        options.callValue = parseValue(args.value as string)
        consola.info(`Sending ${args.value} with transaction`)
      }

      if (args.dryRun) {
        consola.info('Dry run - transaction not sent')
        const estimatedEnergy = 100000
        const estimatedBandwidth = 350
        const cost = estimatedEnergy * 0.00021 + estimatedBandwidth * 0.001
        consola.info('Estimated costs:')
        consola.log(
          formatGasUsage({
            energy: estimatedEnergy,
            bandwidth: estimatedBandwidth,
            cost,
          })
        )
        return
      }

      // Build contract with minimal ABI
      const minimalABI = [
        {
          type: 'function',
          name: funcSig.name,
          inputs: funcSig.inputs.map((input) => ({
            name: input.name || '',
            type: input.type,
          })),
          outputs: funcSig.outputs.map((output) => ({
            name: output.name || '',
            type: output.type,
          })),
          stateMutability: 'nonpayable',
        },
      ]
      const contract = tronWeb.contract(minimalABI, args.address)

      consola.info('Sending transaction...')

      let txId
      if (parsedParams.length > 0)
        txId = await contract[funcSig.name](...parsedParams).send(options)
      else txId = await contract[funcSig.name]().send(options)

      consola.success(`Transaction sent: ${txId}`)

      if (args.confirm) {
        consola.info('Waiting for confirmation...')
        const receipt = (await waitForConfirmation(
          tronWeb,
          txId
        )) as ITransactionReceipt

        if (args.json) consola.log(JSON.stringify(receipt, null, 2))
        else consola.log(formatReceipt(receipt))

        if (receipt.result === 'FAILED')
          throw new Error(
            `Transaction failed: ${receipt.resMessage || 'Unknown error'}`
          )
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      consola.error(errorMessage)
      process.exit(1)
    }
  },
})
