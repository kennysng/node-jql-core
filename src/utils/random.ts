/**
 * Generate a random Date
 * @param start [Date]
 * @param end [Date]
 */
export function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

const firstNames: string[] = ['Oliver', 'Jack', 'Harry', 'Jacob', 'Charlie', 'Thomas', 'George', 'Oscar', 'James', 'William', 'Jake', 'Connor', 'Callum', 'Kyle', 'Joe', 'Reece', 'Rhys', 'Damian', 'Noah', 'Liam', 'Mason', 'Ethan', 'Michael', 'Alesander', 'Daniel', 'John', 'Robert', 'David', 'Richard', 'Joseph', 'Charles']
const lastNames: string[] = ['Chan', 'Kwan', 'Ho', 'Wong', 'Kan', 'Gan', 'Kam', 'Lam', 'Wong', 'Ng', 'Hui', 'Hua', 'Cheung', 'Cheong', 'Chiu', 'Chiew']
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
