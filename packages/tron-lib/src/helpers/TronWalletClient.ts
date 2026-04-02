/**
 * Tron TVM wallet for scripts: same secp256k1 key as viem's local account, TronWeb + full-node HTTP.
 */

import type { TronWeb } from 'tronweb'

import type {
  IExecuteSafeExecTronWebResult,
  ITronSafeExecParams,
  TronTvmNetworkName,
} from '../types'

import { broadcastTronSafeExecTransaction } from '../safe/tronSafeExecBroadcast'
import { createTronWebForTvmNetworkKey } from './tronWebFactory'

export class TronWalletClient {
  private readonly privateKeyHex: string

  public constructor(privateKeyHex: string) {
    this.privateKeyHex = privateKeyHex
  }

  public getTronWeb(networkName: TronTvmNetworkName): TronWeb {
    return createTronWebForTvmNetworkKey({
      networkKey: networkName,
      privateKey: this.privateKeyHex,
    })
  }

  public async executeSafeExecTransaction(
    params: ITronSafeExecParams
  ): Promise<IExecuteSafeExecTronWebResult> {
    return broadcastTronSafeExecTransaction({
      ...params,
      privateKeyHex: this.privateKeyHex,
    })
  }
}
