import { CancelError } from '@kennysng/c-promise'
import { AndExpressions, BinaryExpression, Column, ColumnExpression, CreateDatabaseJQL, CreateTableJQL, DropDatabaseJQL, DropTableJQL, ExistsExpression, FromTable, FunctionExpression, GroupBy, InExpression, JoinClause, OrderBy, PredictJQL, Query, ResultColumn, Value } from 'node-jql'
import { InMemoryDatabaseEngine } from '.'
import { ApplicationCore } from '../core'
import { Resultset } from '../core/result'
import { Session } from '../core/session'
import { Logger } from '../utils/logger'
import { getClasses, getStudents, getWarnings, prepareClass, prepareClub, prepareClubMember, prepareStudent, prepareWarning } from './test.utils'

jest.setTimeout(20000)

let core: ApplicationCore
let session: Session

const students = getStudents(200)
const classes = getClasses(students)
const warnings = getWarnings(1000)

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

test('Prepare tables', async callback => {
  session.update(new CreateTableJQL('empty', [new Column('id', 'number')]))
  await prepareStudent(session, ...students)
  await prepareClass(session, ...classes)
  await prepareWarning(session, ...warnings)
  await prepareClub(session)
  await prepareClubMember(session)
  callback()
})

test('Select all students', async callback => {
  const result = await session.query(new Query('Student'))
  expect(result.rows.length).toBe(students.length)
  callback()
})

test('Select number of students', async callback => {
  const result = new Resultset(await session.query(new Query({
    $select: new ResultColumn(new FunctionExpression('COUNT', new ColumnExpression('*'))),
    $from: 'Student',
  })))
  expect(await result.moveToFirst()).toBe(true)
  expect(await result.get('COUNT(*)')).toBe(students.length)
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

test('Select students with warning(s) with timeout', async callback => {
  const promise = session.query(new Query({
    $from: 'Student',
    $where: new ExistsExpression(new Query(
      [new ResultColumn(new Value(1))],
      'Warning',
      new BinaryExpression(
        new ColumnExpression('Student', 'id'),
        '=',
        new ColumnExpression('Warning', 'studentId'),
      ),
    )),
  }))

  // set timeout
  const taskId = session.lastTaskId
  const timeoutId = setTimeout(() => session.kill(taskId), 10000)

  try {
    const result = new Resultset(await promise)
    clearTimeout(timeoutId)
    expect(await result.moveToFirst()).toBe(true)
    expect(await result.get('name')).toBe('Kennys Ng')
  }
  catch (e) {
    expect(e).toBeInstanceOf(CancelError)
  }
  callback()
})

test('Select students with warning(s) with INNER JOIN', async callback => {
  const result = new Resultset(await session.query(new Query({
    $from: new FromTable('Student', 's',
      new JoinClause('INNER', new FromTable(new Query({
        $select: [
          new ResultColumn('studentId'),
          new ResultColumn(new FunctionExpression('COUNT', new ColumnExpression('*')), 'warnings'),
        ],
        $from: 'Warning',
        $group: new GroupBy('studentId'),
      }), 'w'),
        new BinaryExpression(new ColumnExpression('s', 'id'), '=', new ColumnExpression('w', 'studentId')),
      ),
    ),
  })))
  expect(await result.moveToFirst()).toBe(true)
  expect(await result.get('name')).toBe('Kennys Ng')
  callback()
})

test('Predict Select students with warning count', async callback => {
  const result = await session.predict(new PredictJQL(new Query({
    $select: [
      new ResultColumn(new ColumnExpression('s', '*')),
      new ResultColumn(new FunctionExpression('IFNULL', new ColumnExpression('w', 'warnings'), 0), 'warnings'),
    ],
    $from: new FromTable('Student', 's',
      new JoinClause('LEFT', new FromTable(new Query({
        $select: [
          new ResultColumn('studentId'),
          new ResultColumn(new FunctionExpression('COUNT', new ColumnExpression('studentId')), 'warnings'),
        ],
        $from: 'Warning',
        $group: new GroupBy('studentId'),
      }), 'w'),
        new BinaryExpression(new ColumnExpression('s', 'id'), '=', new ColumnExpression('w', 'studentId')),
      ),
    ),
  })))
  expect(result.columns.length).toBe(7)
  callback()
})

test('Select students with warning count', async callback => {
  const result = new Resultset(await session.query(new Query({
    $select: [
      new ResultColumn(new ColumnExpression('s', '*')),
      new ResultColumn(new FunctionExpression('IFNULL', new ColumnExpression('w', 'warnings'), 0), 'warnings'),
    ],
    $from: new FromTable('Student', 's',
      new JoinClause('LEFT', new FromTable(new Query({
        $select: [
          new ResultColumn('studentId'),
          new ResultColumn(new FunctionExpression('COUNT', new ColumnExpression('studentId')), 'warnings'),
        ],
        $from: 'Warning',
        $group: new GroupBy('studentId'),
      }), 'w'),
        new BinaryExpression(new ColumnExpression('s', 'id'), '=', new ColumnExpression('w', 'studentId')),
      ),
    ),
  })))
  expect(await result.moveToFirst()).toBe(true)
  do {
    if (await result.get('name') === 'Kennys Ng') {
      expect(await result.get('warnings')).toBe(2)
    }
  }
  while (await result.next())
  callback()
})

test('Select students for each class', async callback => {
  const result = new Resultset(await session.query(new Query({
    $select: [
      new ResultColumn(new ColumnExpression('c', 'className'), 'class'),
      new ResultColumn(new FunctionExpression('ROWS'), 'students'),
    ],
    $from: new FromTable('Student', 's', new JoinClause('LEFT', new FromTable('Class', 'c'), new BinaryExpression(new ColumnExpression('s', 'id'), '=', new ColumnExpression('c', 'studentId')))),
    $group: new GroupBy(new ColumnExpression('c', 'className')),
    $order: new OrderBy(new ColumnExpression('c', 'className')),
  }))).toArray()
  expect(Array.isArray(result[0].students)).toBe(true)
  callback()
})

test('Select students from 1A and 1B', async callback => {
  await session.update(new CreateTableJQL({
    $temporary: true,
    name: '1A',
    $as: new Query({
      $select: new ResultColumn(new ColumnExpression('s', '*')),
      $from: new FromTable('Student', 's', new JoinClause('INNER', new FromTable('Class', 'c'), new AndExpressions([
        new BinaryExpression(new ColumnExpression('s', 'id'), '=', new ColumnExpression('c', 'studentId')),
        new BinaryExpression(new ColumnExpression('c', 'className'), '=', '1A'),
      ]))),
    }),
  }))
  await session.update(new CreateTableJQL({
    $temporary: true,
    name: '1B',
    $as: new Query({
      $select: new ResultColumn(new ColumnExpression('s', '*')),
      $from: new FromTable('Student', 's', new JoinClause('INNER', new FromTable('Class', 'c'), new AndExpressions([
        new BinaryExpression(new ColumnExpression('s', 'id'), '=', new ColumnExpression('c', 'studentId')),
        new BinaryExpression(new ColumnExpression('c', 'className'), '=', '1B'),
      ]))),
    }),
  }))
  const aCount = (await session.query(new Query('1A'))).rows.length
  const bCount = (await session.query(new Query('1B'))).rows.length
  const result = await session.query(new Query({
    $from: '1A',
    $union: new Query('1B'),
  }))
  expect(result.rows.length === aCount + bCount).toBe(true)
  callback()
})

test('SPECIAL: Query COUNT(*) on empty table', async callback => {
  const result = new Resultset(await session.query(new Query({
    $select: new ResultColumn(new FunctionExpression('IFNULL', new FunctionExpression('FIND', new BinaryExpression(new ColumnExpression('id'), '=', 0), new ColumnExpression('id')), -1), 'id'),
    $from: 'empty',
  }))).toArray()
  expect(result[0].id === -1).toBe(true)
  callback()
})

test('SPECIAL: Try ORDER BY after GROUP BY', async callback => {
  const result = new Resultset(await session.query(new Query({
    $select: [
      new ResultColumn('className'),
      new ResultColumn(new FunctionExpression('COUNT', new ColumnExpression('studentId')), 'noOfStudents'),
    ],
    $from: 'Class',
    $group: 'className',
    $order: new OrderBy('noOfStudents', 'DESC'),
  }))).toArray()
  expect(result.length).toBe(5)
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
