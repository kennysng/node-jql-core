/* tslint:disable:no-console */

import moment = require('moment')
import { InMemoryEngine } from '.'
import { DatabaseCore } from '../../core'
import { Connection } from '../../core/connection'
import { Column } from '../../schema/column'
import { randomDate, randomFrom, randomName } from '../../utils/random'
import { numberList } from '../../utils/simple'

let databaseCore: DatabaseCore
let connection: Connection

test('Instantiate DatabaseCore', () => {
  databaseCore = new DatabaseCore(new InMemoryEngine())
})

test('Create Connection', () => {
  connection = databaseCore.createConnection()
})

test('Create Database', callback => {
  connection.createDatabase('School')
    .then(() => callback())
})

test('Rename Database', callback => {
  connection.createDatabase('Test1')
    .then(() => connection.renameDatabase('Test1', 'Test2'))
    .then(() => callback())
})

test('Drop Database', callback => {
  connection.dropDatabase('Test2')
    .then(() => callback())
})

test('Use Database', callback => {
  connection.useDatabase('School')
    .then(() => callback())
})

test('Create Table', callback => {
  connection.createTable('Students', [
    new Column('id', 'number'),
    new Column('name', 'string'),
    new Column('gender', 'string'),
    new Column('birthday', 'Date'),
    new Column('createdAt', 'Date'),
    new Column('leaveAt', 'Date', { nullable: true }),
  ])
    .then(() => callback())
})

test('Rename Table', callback => {
  connection.createTable('Test1', [
    new Column('value', 'string'),
  ])
    .then(() => connection.renameTable('Test1', 'Test2'))
    .then(() => callback())
})

test('Drop Table', callback => {
  connection.dropTable('Test2')
    .then(() => callback())
})

test('Insert into Student', callback => {
  connection.insertInto('Student', [
    ...numberList(9).map(id => ({ id, name: randomName(), gender: randomFrom(['M', 'F']), birthday: moment.utc(randomDate(new Date(1992, 1, 1), new Date(1993, 1, 1))).startOf('d').toDate(), createdAt: moment.utc().toDate() })),
    { id: 10, name: 'Kennys Ng', gender: 'M', birthday: moment.utc('1992-06-08', 'YYYY-MM-DD').toDate(), createdAt: moment.utc().toDate() },
  ])
    .then(() => callback())
})

test('Close Connection', () => {
  connection.close()
})
