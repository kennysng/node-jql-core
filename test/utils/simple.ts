/**
 * Generate a list of sequential numbers
 * @param length [number]
 */
export function numberList(length: number): number[] {
  const result = [] as number[]
  for (let i = 0; i < length; i += 1) result[i] = i + 1
  return result
}
