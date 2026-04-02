/**
 * Tron TVM network key detection.
 */

export function isTronNetworkKey(
  networkName: string | undefined
): networkName is string {
  if (networkName === undefined) return false
  const key = networkName.toLowerCase()
  return key === 'tron' || key === 'tronshasta'
}
