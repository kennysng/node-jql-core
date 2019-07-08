import moment = require('moment')
import { Column, CreateDatabaseJQL, CreateTableJQL, DropDatabaseJQL, DropTableJQL, InsertJQL, Query, Type } from 'node-jql'
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
  callback()
})

test('Insert into table', async callback => {
  await session.update(new InsertJQL('Student',
    { id: 1, name: 'Kennys Ng', gender: 'M', birthday: moment('1992-04-21').toDate(), admittedAt: new Date() },
    { id: 2, name: 'Kirino Chiba', gender: 'F', birthday: moment('1992-06-08').toDate(), admittedAt: new Date() },
  ))
  callback()
})

test('Select all students', async callback => {
  const result = await session.query(new Query('Student'))
  expect(result.rows.length).toBe(2)
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
  session.close()
})
