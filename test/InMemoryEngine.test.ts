/* tslint:disable:no-console */

import { CancelError } from '@kennysng/c-promise'
import moment = require('moment')
import { AddressInfo } from 'net'
import { BetweenExpression, BinaryExpression, Case, CaseExpression, ColumnExpression, ExistsExpression, FunctionExpression, InExpression, IsNullExpression, JoinClause, JoinedTableOrSubquery, LikeExpression, MathExpression, OrderingTerm, Query, ResultColumn, TableOrSubquery, Unknown, Value } from 'node-jql'
import { Connection, DatabaseCore } from '../src/core'
import { InMemoryEngine } from '../src/engine/memory'
import { Column } from '../src/schema'
import server from './remote/server'
import { randomDate, randomFrom, randomInteger, randomName } from './utils/random'
import { numberList } from './utils/simple'

let databaseCore: DatabaseCore
let connection: Connection

const students = [
  ...numberList(198).map(id => ({ id,
    name: randomName(),
    gender: randomFrom(['M', 'F']),
    birthday: moment.utc(randomDate(moment.utc('1992-01-01', 'YYYY-MM-DD').toDate(), moment.utc('1993-01-01', 'YYYY-MM-DD').toDate())).startOf('d').toDate(),
    createdAt: randomDate(moment.utc('2010-01-01', 'YYYY-MM-DD').toDate(), moment.utc('2012-01-01', 'YYYY-MM-DD').toDate()),
    leaveAt: randomFrom([undefined, randomDate(moment.utc('2015-01-01', 'YYYY-MM-DD').toDate(), moment.utc('2017-01-01', 'YYYY-MM-DD').toDate())]),
  })),
  { id: 999, name: 'Kennys Ng', gender: 'M', birthday: moment.utc('1992-04-21', 'YYYY-MM-DD').toDate(),
    createdAt: randomDate(moment.utc('2010-01-01', 'YYYY-MM-DD').toDate(), moment.utc('2012-01-01', 'YYYY-MM-DD').toDate()),
    leaveAt: randomDate(moment.utc('2015-01-01', 'YYYY-MM-DD').toDate(), moment.utc('2017-01-01', 'YYYY-MM-DD').toDate()),
  },
  { id: 1000, name: 'Kennys Ng', gender: 'M', birthday: moment.utc('2000-06-08', 'YYYY-MM-DD').toDate(), createdAt: moment.utc().toDate() },
]

const marks = [
  ...students.map(student => ({
    studentId: student.id,
    test: 'Chinese',
    mark: randomInteger(0, 100),
  })),
  ...students.map(student => ({
    studentId: student.id,
    test: 'English',
    mark: randomInteger(0, 100),
  })),
  ...students.map(student => ({
    studentId: student.id,
    test: 'Science',
    mark: randomInteger(0, 100),
  })),
  ...students.map(student => ({
    studentId: student.id,
    test: 'Mathematics',
    mark: student.id === 999 ? 99 : randomInteger(0, 100),
  })),
  ...students.map(student => ({
    studentId: student.id,
    test: 'Computer',
    mark: student.id === 999 ? 100 : randomInteger(0, 100),
  })),
]

test('Instantiate DatabaseCore', () => {
  databaseCore = new DatabaseCore(new InMemoryEngine(), {
    logging: true,
  })
})

test('Create Connection', () => {
  connection = databaseCore.createConnection()
})

test('Create Database', async callback => {
  try {
    await connection.createDatabase('School')
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Rename Database', async callback => {
  try {
    await connection.createDatabase('Test1')
    await connection.renameDatabase('Test1', 'Test2')
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Drop Database', async callback => {
  try {
    await connection.dropDatabase('Test2')
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Use Database', async callback => {
  try {
    await connection.useDatabase('School')
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Create Table', async callback => {
  try {
    const promises = [
      connection.createTable('Student', [
        new Column('id', 'number'),
        new Column('name', 'string'),
        new Column('gender', 'string'),
        new Column('birthday', 'Date'),
        new Column('createdAt', 'Date'),
        new Column('leaveAt', 'Date'),
      ]),
      connection.createTable('StudentMark', [
        new Column('studentId', 'number'),
        new Column('test', 'string'),
        new Column('mark', 'number'),
      ]),
    ]
    await Promise.all(promises)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Rename Table', async callback => {
  try {
    await connection.createTable('Test1', [
      new Column('value', 'string'),
    ])
    await connection.renameTable('Test1', 'Test2')
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Drop Table', async callback => {
  try {
    await connection.dropTable('Test2')
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Insert into Student', async callback => {
  try {
    await connection.insertInto('Student', students)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Insert into StudentMark', async callback => {
  try {
    await connection.insertInto('StudentMark', marks)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test Query', async callback => {
  try {
    const query = new Query({ $from: 'Student' })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test Query w/o FROM', async callback => {
  try {
    const query = new Query({
      $select: new ResultColumn({
        expression: new MathExpression({
          left: new Unknown(),
          operator: '+',
          right: new Unknown(),
        }),
      }),
    })
    await connection.query(query, 1, 1)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test BetweenExpression', async callback => {
  try {
    const query = new Query({
      $from: 'Student',
      $where: new BetweenExpression({
        left: new ColumnExpression('birthday'),
        start: moment.utc('1992-04-01', 'YYYY-MM-DD').toDate(),
        end: moment.utc('1992-05-01', 'YYYY-MM-DD').toDate(),
      }),
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test BinaryExpression', async callback => {
  try {
    const query = new Query({
      $from: 'Student',
      $where: new BinaryExpression({
        left: new ColumnExpression('gender'),
        operator: '=',
        right: 'M',
      }),
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test CaseExpression and DISTINCT', async callback => {
  try {
    const query = new Query({
      $distinct: true,
      $select: [
        new ResultColumn({
          expression: new CaseExpression({
            cases: [
              new Case({
                $when: new BinaryExpression({ left: new ColumnExpression('name'), operator: '=', right: 'Kennys Ng' }),
                $then: new Value('Hi, I\'m Kennys Ng'),
              }),
              new Case({
                $when: new BinaryExpression({ left: new ColumnExpression('gender'), operator: '=', right: 'M' }),
                $then: new Value('Hi, I\'m male'),
              }),
            ],
            $else: new Value('Hi, I\'m female'),
          }),
          $as: 'greeting',
        }),
      ],
      $from: 'Student',
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test ExistsExpression', async callback => {
  try {
    const query = new Query({
      $from: new TableOrSubquery(['Student', 's1']),
      $where: new ExistsExpression({
        query: new Query({
          $select: [new ResultColumn({ expression: new Value('x') })],
          $from: new TableOrSubquery(['Student', 's2']),
          $where: [
            new BinaryExpression({
              left: new ColumnExpression(['s1', 'id']),
              operator: '<>',
              right: new ColumnExpression(['s2', 'id']),
            }),
            new BinaryExpression({
              left: new ColumnExpression(['s1', 'name']),
              operator: '=',
              right: new ColumnExpression(['s2', 'name']),
            }),
          ],
        }),
      }),
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test FunctionExpression', async callback => {
  try {
    const query = new Query({
      $select: new ResultColumn({
        expression: new FunctionExpression({ name: 'COUNT', parameters: new ColumnExpression('id') }),
      }),
      $from: 'Student',
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test InExpression', async callback => {
  try {
    const query = new Query({
      $from: 'Student',
      $where: new InExpression({
        left: new ColumnExpression('name'),
        right: ['Kennys Ng', ...numberList(9).map(() => randomName())],
      }),
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test IsNullExpression and ORDER BY', async callback => {
  try {
    const query = new Query({
      $from: 'Student',
      $where: new IsNullExpression({
        left: new ColumnExpression('leaveAt'),
        $not: true,
      }),
      $order: 'leaveAt',
      $limit: 5,
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test LikeExpression', async callback => {
  try {
    const query = new Query({
      $from: 'Student',
      $where: new LikeExpression({ left: new ColumnExpression('name') }),
    })
    await connection.query(query, 'Ng$')
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test JoinClause', async callback => {
  try {
    const query = new Query({
      $from: new JoinedTableOrSubquery({
        table: 'Student',
        $as: 's',
        joinClauses: new JoinClause({
          tableOrSubquery: ['StudentMark', 'sm'],
          operator: 'LEFT',
          $on: new BinaryExpression({ left: new ColumnExpression(['s', 'id']), operator: '=', right: new ColumnExpression(['sm', 'studentId']) }),
        }),
      }),
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test Remote Table', async callback => {
  try {
    const query = new Query({
      $select: new ResultColumn({
        expression: new FunctionExpression({ name: 'COUNT', parameters: new ColumnExpression('name') }),
      }),
      $from: new TableOrSubquery({
        table: {
          url: `http://localhost:${(server.address() as AddressInfo).port}`,
          columns: [{ name: 'name', type: 'string' }, { name: 'value', type: 'string' }],
        },
        $as: 'Test',
      }),
    })
    await connection.query(query)
    callback()
  }
  catch (e) {
    callback(e)
  }
})

test('Test cancel query', callback => {
  const query = new Query({
    $select: new ResultColumn({
      expression: new FunctionExpression({ name: 'COUNT', parameters: new ColumnExpression('name') }),
    }),
    $from: new TableOrSubquery({
      table: {
        url: `http://localhost:${(server.address() as AddressInfo).port}`,
        columns: [{ name: 'name', type: 'string' }, { name: 'value', type: 'string' }],
      },
      $as: 'Test',
    }),
  })
  connection.query(query)
    .then(() => callback())
    .catch(e => {
      try {
        expect(e).toBeInstanceOf(CancelError)
        callback()
      }
      catch (e) {
        callback(e)
      }
    })
  connection.cancel(connection.runningQueries[0].id)
})

test('Close Connection', () => {
  connection.close()
  server.close()
})
