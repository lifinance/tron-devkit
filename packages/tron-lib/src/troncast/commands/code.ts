import { defineCommand } from 'citty'
import { consola } from 'consola'

import type { Environment } from '../types'
import { isValidAddress } from '../utils/parser'
import { initTronWeb } from '../utils/tronweb'

export const codeCommand = defineCommand({
  meta: {
    name: 'code',
    description: 'Get contract bytecode from a Tron address',
  },
  args: {
    address: {
      type: 'positional',
      description: 'Contract address',
      required: true,
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

      let addressToCheck = args.address
      if (addressToCheck.startsWith('0x') || addressToCheck.startsWith('41')) {
        addressToCheck = tronWeb.address.fromHex(
          addressToCheck.startsWith('0x')
            ? addressToCheck
            : `0x${addressToCheck}`
        )
      }

      const contractInfo = await tronWeb.trx.getContract(addressToCheck)

      if (!contractInfo || !contractInfo.bytecode) {
        console.log('0x')
        return
      }

      const bytecode = contractInfo.bytecode.startsWith('0x')
        ? contractInfo.bytecode
        : `0x${contractInfo.bytecode}`

      console.log(bytecode)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      consola.error(errorMessage)
      process.exit(1)
    }
  },
})
