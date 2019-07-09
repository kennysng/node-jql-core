import moment = require('moment')
import { BinaryExpression, Column, ColumnExpression, CreateDatabaseJQL, CreateTableJQL, DropDatabaseJQL, DropTableJQL, ExistsExpression, FunctionExpression, InExpression, InsertJQL, Query, ResultColumn, Type } from 'node-jql'
import { InMemoryDatabaseEngine } from '.'
import { ApplicationCore } from '../core'
import { Resultset } from '../core/result'
import { Session } from '../core/session'
import { Logger } from '../utils/logger'
import { JQLAggregateFunction } from './function'
import { SumFunction } from './function/numeric/aggregate/sum'

let core: ApplicationCore
let session: Session

test('Initialize application core', async callback => {
  core = new ApplicationCore({ defaultEngine: new InMemoryDatabaseEngine({ logger: new Logger('InMemoryDatabaseEngine') }) })
  await core.init()
  callback()
})

test('Create session', () => {
  session = core.createSession()
})

test('Create database', async callback => {
  await session.update(new CreateDatabaseJQL('School'))
  session.use('School')
  callback()
})

test('Create table', async callback => {
  await session.update(new CreateTableJQL('Student', [
    new Column<Type>('id', 'number', false, 'PRIMARY KEY'),
    new Column<Type>('name', 'string', false),
    new Column<Type>('gender', 'string', false),
    new Column<Type>('birthday', 'Date', false),
    new Column<Type>('admittedAt', 'Date', false),
    new Column<Type>('graduatedAt', 'Date', true),
  ]))
  await session.update(new CreateTableJQL('Warning', [
    new Column<Type>('id', 'number', false, 'PRIMARY KEY'),
    new Column<Type>('studentId', 'number', false),
    new Column<Type>('createdAt', 'Date', false),
  ]))
  await session.update(new CreateTableJQL('Club', [
    new Column<Type>('id', 'number', false, 'PRIMARY KEY'),
    new Column<Type>('name', 'string', false),
    new Column<Type>('createdAt', 'Date', false),
    new Column<Type>('deletedAt', 'Date', true),
  ]))
  await session.update(new CreateTableJQL('ClubMember', [
    new Column<Type>('id', 'number', false, 'PRIMARY KEY'),
    new Column<Type>('clubId', 'number', false),
    new Column<Type>('studentId', 'number', false),
    new Column<Type>('joinAt', 'Date', false),
    new Column<Type>('leaveAt', 'Date', true),
  ]))
  callback()
})

test('Insert into table', async callback => {
  await session.update(new InsertJQL('Student',
    { id: 1, name: 'Kennys Ng', gender: 'M', birthday: moment('1992-04-21').toDate(), admittedAt: new Date() },
    { id: 2, name: 'Kirino Chiba', gender: 'F', birthday: moment('1992-06-08').toDate(), admittedAt: new Date() },
  ))
  await session.update(new InsertJQL('Warning',
    { id: 1, studentId: 1, createdAt: moment('2010-07-08').toDate() },
    { id: 2, studentId: 1, createdAt: moment('2011-05-31').toDate() },
  ))
  await session.update(new InsertJQL('Club',
    { id: 1, name: 'Kendo Club', createdAt: moment('2000-04-04').toDate() },
  ))
  await session.update(new InsertJQL('ClubMember',
    { id: 1, clubId: 1, studentId: 2, joinAt: new Date() },
  ))
  callback()
})

test('Select all students', async callback => {
  const result = await session.query(new Query('Student'))
  expect(result.rows.length).toBe(2)
  callback()
})

test('Select number of students', async callback => {
  const result = new Resultset(await session.query(new Query({
    $select: new ResultColumn(new FunctionExpression('COUNT', new ColumnExpression('id'))),
    $from: 'Student',
  })))
  expect(await result.moveToFirst()).toBe(true)
  expect(await result.get('COUNT(id)')).toBe(2)
  callback()
})

test('Select students in Kendo Club', async callback => {
  const result = new Resultset(await session.query(new Query({
    $from: 'Student',
    $where: new InExpression(new ColumnExpression('id'), false, new Query(
      [new ResultColumn('studentId')],
      'ClubMember',
      new BinaryExpression(new ColumnExpression('clubId'), '=', 1),
    )),
  })))
  expect(await result.moveToFirst()).toBe(true)
  expect(await result.get('name')).toBe('Kirino Chiba')
  callback()
})

test('Select students with warning(s)', async callback => {
  const result = new Resultset(await session.query(new Query({
    $from: 'Student',
    $where: new ExistsExpression(new Query(
      [new ResultColumn('*')],
      'Warning',
      new BinaryExpression(
        new ColumnExpression('Student', 'id'),
        '=',
        new ColumnExpression('Warning', 'studentId'),
      ),
    )),
  })))
  expect(await result.moveToFirst()).toBe(true)
  expect(await result.get('name')).toBe('Kennys Ng')
  callback()
})

test('Drop table', async callback => {
  await session.update(new DropTableJQL('Student'))
  callback()
})

test('Drop database', async callback => {
  await session.update(new DropDatabaseJQL('School'))
  callback()
})

test('Close session', () => {
  session.close(true)
})
