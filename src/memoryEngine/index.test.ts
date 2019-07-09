import moment = require('moment')
import { BinaryExpression, Column, ColumnExpression, CreateDatabaseJQL, CreateTableJQL, DropDatabaseJQL, DropTableJQL, ExistsExpression, InsertJQL, Query, ResultColumn, Type } from 'node-jql'
import { InMemoryDatabaseEngine } from '.'
import { ApplicationCore } from '../core'
import { Session } from '../core/session'
import { Logger } from '../utils/logger'

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
  callback()
})

test('Select all students', async callback => {
  const result = await session.query(new Query('Student'))
  expect(result.rows.length).toBe(2)
  callback()
})

test('Select students with warning(s)', async callback => {
  const result = await session.query(new Query({
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
  }))
  expect(result.rows.length).toBe(1)
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
