/**
 * Check if a value is undefined or null
 * @param value [any]
 */
export default function isUndefined(value: any): value is undefined {
  return value === undefined || value === null
}
