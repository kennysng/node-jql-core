import moment = require('moment')
import { CreateTableJQL, InsertJQL, Type } from 'node-jql'
import { Session } from '../core/session'
import { randomDate, randomFrom, randomInteger, randomName } from '../utils/random'
import { MemoryColumn } from './table'

/**
 * Create a list of sequential numbers
 * @param count [number]
 */
export function numberList(count: number): number[] {
  const result = [] as number[]
  for (let i = 0; i < count; i += 1) result.push(i)
  return result
}

/**
 * Create a list of students
 * @param length [number]
 */
export function getStudents(length: number): any[] {
  return [
    { id: 1, name: 'Kennys Ng', gender: 'M', birthday: moment('1992-04-21').toDate(), admittedAt: new Date() },
    { id: 2, name: 'Kirino Chiba', gender: 'F', birthday: moment('1992-06-08').toDate(), admittedAt: new Date() },
    ...numberList(length - 2).map(id => ({
      id: id + 2,
      name: randomName(),
      gender: randomFrom(['M', 'F']),
      birthday: randomDate(moment('1990-01-01').toDate(), moment('1993-12-31').toDate()),
      admittedAt: new Date(),
    })),
  ]
}

/**
 * Create a list of warnings
 * @param length [number]
 */
export function getWarnings(length: number): any[] {
  return [
    { id: 1, studentId: 1, createdAt: moment('2010-07-08').toDate() },
    { id: 2, studentId: 1, createdAt: moment('2011-05-31').toDate() },
    ...numberList(length - 2).map(id => ({
      id: id + 2,
      studentId: randomInteger(3, 1000),
      createdAt: new Date(),
    })),
  ]
}

/**
 * Prepare student table
 * @param session [Session]
 */
export async function prepareStudent(session: Session, ...students: any[]): Promise<void> {
  await session.update(new CreateTableJQL('Student', [
    new MemoryColumn<Type>('id', 'number', false, 'PRIMARY KEY'),
    new MemoryColumn<Type>('name', 'string', false),
    new MemoryColumn<Type>('gender', 'string', false),
    new MemoryColumn<Type>('birthday', 'Date', false),
    new MemoryColumn<Type>('admittedAt', 'Date', false),
    new MemoryColumn<Type>('graduatedAt', 'Date', true),
  ]))
  await session.update(new InsertJQL('Student', ...students))
}

/**
 * Prepare warning table
 * @param session [Session]
 */
export async function prepareWarning(session: Session, ...warnings: any[]): Promise<void> {
  await session.update(new CreateTableJQL('Warning', [
    new MemoryColumn<Type>('id', 'number', false, 'PRIMARY KEY'),
    new MemoryColumn<Type>('studentId', 'number', false),
    new MemoryColumn<Type>('createdAt', 'Date', false),
  ]))
  await session.update(new InsertJQL('Warning', ...warnings))
}

/**
 * Prepare club table
 * @param session [Session]
 */
export async function prepareClub(session: Session): Promise<void> {
  await session.update(new CreateTableJQL('Club', [
    new MemoryColumn<Type>('id', 'number', false, 'PRIMARY KEY'),
    new MemoryColumn<Type>('name', 'string', false),
    new MemoryColumn<Type>('createdAt', 'Date', false),
    new MemoryColumn<Type>('deletedAt', 'Date', true),
  ]))
  await session.update(new InsertJQL('Club',
    { id: 1, name: 'Kendo Club', createdAt: moment('2000-04-04').toDate() },
  ))
}

/**
 * Prepare club member table
 * @param session [Session]
 */
export async function prepareClubMember(session: Session): Promise<void> {
  await session.update(new CreateTableJQL('ClubMember', [
    new MemoryColumn<Type>('id', 'number', false, 'PRIMARY KEY'),
    new MemoryColumn<Type>('clubId', 'number', false),
    new MemoryColumn<Type>('studentId', 'number', false),
    new MemoryColumn<Type>('joinAt', 'Date', false),
    new MemoryColumn<Type>('leaveAt', 'Date', true),
  ]))
  await session.update(new InsertJQL('ClubMember',
    { id: 1, clubId: 1, studentId: 2, joinAt: new Date() },
  ))
}
