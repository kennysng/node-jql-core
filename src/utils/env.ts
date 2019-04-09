/**
 * Get environmental variable for JQL with the given key
 * @param key [string]
 */
export function getEnv(key: string): string|undefined {
  return process.env[`JQL_${key.toLocaleUpperCase()}`]
}

/**
 * Set environmental variable for JQL with the given key
 * @param key [string]
 */
export function setEnv(key: string, value: string) {
  process.env[`JQL_${key.toLocaleUpperCase()}`] = value
}
