import { firstNames, lastNames } from './names'

/**
 * Generate a random Date
 * @param start [Date]
 * @param end [Date]
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

/**
 * Generate a random name
 */
export function randomName(): string {
  return `${randomFrom(firstNames)} ${randomFrom(lastNames)}`
}

/**
 * Get a random value from the given list
 * @param list [Array<any>]
 */
export function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}
