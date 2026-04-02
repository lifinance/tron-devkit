import type { IFunctionSignature, IParameter } from '../types'

export function parseFunctionSignature(signature: string): IFunctionSignature {
  const returnsMatch = signature.match(
    /^([^)]+\))\s*(?:returns?\s*\(([^)]*)\))?/
  )
  if (!returnsMatch || !returnsMatch[1])
    throw new Error(`Invalid function signature: ${signature}`)

  const funcPart = returnsMatch[1]
  const returnsPart = returnsMatch[2] || ''

  const funcMatch = funcPart.match(/^(\w+)\((.*)\)$/)
  if (!funcMatch || !funcMatch[1] || funcMatch[2] === undefined)
    throw new Error(`Invalid function signature: ${signature}`)

  const name = funcMatch[1]
  const inputsStr = funcMatch[2]

  const inputs = parseParameters(inputsStr)
  const outputs = returnsPart ? parseParameters(returnsPart) : []

  return { name, inputs, outputs }
}

function parseParameters(paramsStr: string): IParameter[] {
  if (!paramsStr.trim()) return []

  const params = paramsStr.split(',').map((p) => p.trim())
  return params.map((param) => {
    const parts = param.split(/\s+/)
    if (parts.length === 1 && parts[0]) return { type: parts[0] }
    else if (parts[0] && parts[1]) return { type: parts[0], name: parts[1] }

    throw new Error(`Invalid parameter: ${param}`)
  })
}

export function parseArgument(type: string, value: string): any {
  if (type.endsWith('[]')) {
    try {
      return JSON.parse(value)
    } catch {
      throw new Error(`Invalid array format: ${value}`)
    }
  } else if (type === 'address') return value
  else if (type.startsWith('uint') || type.startsWith('int')) return value
  else if (type === 'bool') return value === 'true'
  else if (type.startsWith('bytes'))
    return value.startsWith('0x') ? value : '0x' + value
  else if (type === 'string') return value

  return value
}

export function isValidAddress(address: string): boolean {
  if (address.startsWith('T') && address.length === 34) return true
  else if (address.startsWith('0x') && address.length === 42) return true
  else if (address.startsWith('41') && address.length === 42) return true

  return false
}
