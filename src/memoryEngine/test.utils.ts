import moment = require('moment')
import { CreateTableJQL, InsertJQL, Type } from 'node-jql'
import { Session } from '../core/session'
import { randomDate, randomFrom, randomInteger, randomName } from '../utils/random'
import { Column } from './table'

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
 */
export function getStudents(): any[] {
  return [
    { id: 1, name: 'Kennys Ng', gender: 'M', birthday: moment('1992-04-21').toDate(), admittedAt: new Date() },
    { id: 2, name: 'Kirino Chiba', gender: 'F', birthday: moment('1992-06-08').toDate(), admittedAt: new Date() },
    ...numberList(998).map(id => ({
      id: id + 2,
      name: randomName(),
      gender: randomFrom(['M', 'F']),
      birthday: randomDate(moment('1990-01-01').toDate(), moment('1993-12-31').toDate()),
      admittedAt: new Date(),
    })),
  ]
}

/**
 * Prepare student table
 * @param session [Session]
 */
export async function prepareStudent(session: Session, ...students: any[]): Promise<void> {
  await session.update(new CreateTableJQL('Student', [
    new Column<Type>('id', 'number', false, 'PRIMARY KEY'),
    new Column<Type>('name', 'string', false),
    new Column<Type>('gender', 'string', false),
    new Column<Type>('birthday', 'Date', false),
    new Column<Type>('admittedAt', 'Date', false),
    new Column<Type>('graduatedAt', 'Date', true),
  ]))
  await session.update(new InsertJQL('Student', ...students))
}

/**
 * Prepare warning table
 * @param session [Session]
 */
export async function prepareWarning(session: Session): Promise<void> {
  await session.update(new CreateTableJQL('Warning', [
    new Column<Type>('id', 'number', false, 'PRIMARY KEY'),
    new Column<Type>('studentId', 'number', false),
    new Column<Type>('createdAt', 'Date', false),
  ]))
  await session.update(new InsertJQL('Warning',
    { id: 1, studentId: 1, createdAt: moment('2010-07-08').toDate() },
    { id: 2, studentId: 1, createdAt: moment('2011-05-31').toDate() },
    ...numberList(298).map(id => ({
      id: id + 2,
      studentId: randomInteger(3, 1000),
      createdAt: new Date(),
    })),
  ))
}

/**
 * Prepare club table
 * @param session [Session]
 */
export async function prepareClub(session: Session): Promise<void> {
  await session.update(new CreateTableJQL('Club', [
    new Column<Type>('id', 'number', false, 'PRIMARY KEY'),
    new Column<Type>('name', 'string', false),
    new Column<Type>('createdAt', 'Date', false),
    new Column<Type>('deletedAt', 'Date', true),
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
    new Column<Type>('id', 'number', false, 'PRIMARY KEY'),
    new Column<Type>('clubId', 'number', false),
    new Column<Type>('studentId', 'number', false),
    new Column<Type>('joinAt', 'Date', false),
    new Column<Type>('leaveAt', 'Date', true),
  ]))
  await session.update(new InsertJQL('ClubMember',
    { id: 1, clubId: 1, studentId: 2, joinAt: new Date() },
  ))
}
