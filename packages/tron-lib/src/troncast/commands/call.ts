import { defineCommand } from 'citty'
import { consola } from 'consola'
import type { AbiFunction } from 'viem'
import { decodeFunctionResult, parseAbi } from 'viem'

import type { Environment } from '../types'
import {
  parseFunctionSignature,
  parseArgument,
  isValidAddress,
} from '../utils/parser'
import { initTronWeb } from '../utils/tronweb'

export const callCommand = defineCommand({
  meta: {
    name: 'call',
    description: 'Call a read-only function on a Tron contract',
  },
  args: {
    address: {
      type: 'positional',
      description: 'Contract address',
      required: true,
    },
    signature: {
      type: 'positional',
      description: 'Function signature (e.g., "balanceOf(address)")',
      required: true,
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
    rpcUrl: {
      type: 'string',
      description: 'Custom RPC URL (overrides environment variable)',
    },
  },
  async run({ args }) {
    try {
      if (!isValidAddress(args.address))
        throw new Error(`Invalid contract address: ${args.address}`)

      const env = args.env as Environment
      if (env !== 'mainnet' && env !== 'testnet')
        throw new Error('Environment must be "mainnet" or "testnet"')

      const tronWeb = initTronWeb(env, undefined, args.rpcUrl)
      const funcSig = parseFunctionSignature(args.signature)
      const abi = parseAbi([`function ${args.signature}`] as readonly string[])

      consola.debug(`Calling ${funcSig.name} on ${args.address}`)

      const params = args.params
        ? args.params.split(',').map((p) => p.trim())
        : []
      if (params.length !== funcSig.inputs.length)
        throw new Error(
          `Expected ${funcSig.inputs.length} parameters, got ${params.length}`
        )

      const parsedParams = params.map((param, i) => {
        const inputType = funcSig.inputs[i]?.type || 'string'
        return parseArgument(inputType, param)
      })

      const formattedParams = parsedParams.map((param, i) => {
        if (
          funcSig.inputs[i]?.type === 'address' &&
          typeof param === 'string'
        ) {
          if (param.startsWith('0x')) return tronWeb.address.fromHex(param)
          return param
        }
        return param
      })

      const parameter =
        formattedParams.length > 0
          ? formattedParams.map((param, i) => ({
              type: funcSig.inputs[i]?.type || 'string',
              value: param,
            }))
          : []

      const result = await tronWeb.transactionBuilder.triggerConstantContract(
        args.address,
        funcSig.name +
          '(' +
          funcSig.inputs.map((input) => input.type).join(',') +
          ')',
        {},
        parameter,
        tronWeb.defaultAddress?.base58 || tronWeb.defaultAddress?.hex || ''
      )

      if (!result?.result?.result) {
        const errorMsg = result?.constant_result?.[0]
          ? tronWeb.toUtf8(result.constant_result[0])
          : 'Unknown error'
        throw new Error(`Call failed: ${errorMsg}`)
      }

      if (!(abi[0] as AbiFunction)?.outputs.length) {
        if (result.constant_result.length)
          console.log(`0x${result.constant_result[0]}`)
        return
      }

      const decodedResult = decodeFunctionResult({
        abi,
        functionName: funcSig.name,
        data: `0x${result.constant_result[0]}`,
      })

      const convertAddressesToTron = (value: unknown): unknown => {
        if (typeof value === 'bigint') return value.toString()
        if (typeof value === 'string') {
          if (/^0x[a-fA-F0-9]{40}$/i.test(value))
            return tronWeb.address.fromHex(value)
          return value
        }
        if (Array.isArray(value)) return value.map(convertAddressesToTron)
        if (typeof value === 'object' && value !== null) {
          const converted: Record<string, unknown> = {}
          for (const key in value)
            converted[key] = convertAddressesToTron(
              (value as Record<string, unknown>)[key]
            )
          return converted
        }
        return value
      }

      const convertedResult = convertAddressesToTron(decodedResult)
      const output = JSON.stringify(convertedResult, null, 0)
        .replace(/,/g, ' ')
        .replace(/"/g, '')

      console.log(output)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      consola.error(errorMessage)
      process.exit(1)
    }
  },
})
