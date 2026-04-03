import { readFile } from 'fs/promises'
import { resolve } from 'path'

import { consola } from 'consola'

import type { IForgeArtifact } from '../types'

/**
 * Load compiled contract artifact from Forge output.
 * @param contractName - Name of the contract (e.g. 'CatapultarFactory')
 * @param artifactsDir - Path to the Forge output directory (default: `${cwd}/out`)
 */
export async function loadForgeArtifact(
  contractName: string,
  artifactsDir: string = resolve(process.cwd(), 'out')
): Promise<IForgeArtifact> {
  const artifactPath = resolve(
    artifactsDir,
    `${contractName}.sol/${contractName}.json`
  )

  try {
    const artifact = JSON.parse(await readFile(artifactPath, 'utf-8'))

    if (!artifact.abi || !artifact.bytecode?.object)
      throw new Error(
        `Invalid artifact for ${contractName}: missing ABI or bytecode`
      )

    consola.info(`Loaded ${contractName} from: ${artifactPath}`)
    return artifact
  } catch (error: any) {
    throw new Error(`Failed to load ${contractName} artifact: ${error.message}`)
  }
}
