import uuid = require('uuid/v4')

/**
 * Name of the temporary database
 */
export const TEMP_DB_NAME = uuid()

/**
 * Avoid showing the real name of the temp DB
 * @param name [string]
 */
export function databaseName(name: string): string {
  return name === TEMP_DB_NAME ? 'TEMP_DB' : name
}
