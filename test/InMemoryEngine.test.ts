/* tslint:disable:no-console */

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

test('Create Database', callback => {
  connection.createDatabase('School')
    .then(() => callback())
    .catch(e => callback(e))
})

test('Rename Database', callback => {
  connection.createDatabase('Test1')
    .then(() => connection.renameDatabase('Test1', 'Test2'))
    .then(() => callback())
    .catch(e => callback(e))
})

test('Drop Database', callback => {
  connection.dropDatabase('Test2')
    .then(() => callback())
    .catch(e => callback(e))
})

test('Use Database', callback => {
  connection.useDatabase('School')
    .then(() => callback())
    .catch(e => callback(e))
})

test('Create Table', callback => {
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
  Promise.all(promises)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Rename Table', callback => {
  connection.createTable('Test1', [
    new Column('value', 'string'),
  ])
    .then(() => connection.renameTable('Test1', 'Test2'))
    .then(() => callback())
    .catch(e => callback(e))
})

test('Drop Table', callback => {
  connection.dropTable('Test2')
    .then(() => callback())
    .catch(e => callback(e))
})

test('Insert into Student', callback => {
  connection.insertInto('Student', students)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Insert into StudentMark', callback => {
  connection.insertInto('StudentMark', marks)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test Query', callback => {
  const query = new Query({ $from: 'Student' })
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test Query w/o FROM', callback => {
  const query = new Query({
    $select: new ResultColumn({
      expression: new MathExpression({
        left: new Unknown(),
        operator: '+',
        right: new Unknown(),
      }),
    }),
  })
  connection.query(query, 1, 1)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test BetweenExpression', callback => {
  const query = new Query({
    $from: 'Student',
    $where: new BetweenExpression({
      left: new ColumnExpression('birthday'),
      start: moment.utc('1992-04-01', 'YYYY-MM-DD').toDate(),
      end: moment.utc('1992-05-01', 'YYYY-MM-DD').toDate(),
    }),
  })
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test BinaryExpression', callback => {
  const query = new Query({
    $from: 'Student',
    $where: new BinaryExpression({
      left: new ColumnExpression('gender'),
      operator: '=',
      right: 'M',
    }),
  })
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test CaseExpression and DISTINCT', callback => {
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
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test ExistsExpression', callback => {
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
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test FunctionExpression', callback => {
  const query = new Query({
    $select: new ResultColumn({
      expression: new FunctionExpression({ name: 'COUNT', parameters: new ColumnExpression('id') }),
    }),
    $from: 'Student',
  })
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test InExpression', callback => {
  const query = new Query({
    $from: 'Student',
    $where: new InExpression({
      left: new ColumnExpression('name'),
      right: ['Kennys Ng', ...numberList(9).map(() => randomName())],
    }),
  })
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test IsNullExpression and ORDER BY', callback => {
  const query = new Query({
    $from: 'Student',
    $where: new IsNullExpression({
      left: new ColumnExpression('leaveAt'),
      $not: true,
    }),
    $order: 'leaveAt',
    $limit: 5,
  })
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test LikeExpression', callback => {
  const query = new Query({
    $from: 'Student',
    $where: new LikeExpression({ left: new ColumnExpression('name') }),
  })
  connection.query(query, 'Ng$')
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test JoinClause', callback => {
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
  connection.query(query)
    .then(() => callback())
    .catch(e => callback(e))
})

test('Test Remote Table', callback => {
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
    .catch(e => callback(e))
    .finally(() => server.close())
})

test('Close Connection', () => {
  connection.close()
})
