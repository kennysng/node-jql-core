import { CancelError } from '@kennysng/c-promise'
import { BinaryExpression, ColumnExpression, CreateDatabaseJQL, DropDatabaseJQL, DropTableJQL, ExistsExpression, FromTable, FunctionExpression, GroupBy, InExpression, JoinClause, PredictJQL, Query, ResultColumn, Value } from 'node-jql'
import { InMemoryDatabaseEngine } from '.'
import { ApplicationCore } from '../core'
import { Resultset } from '../core/result'
import { Session } from '../core/session'
import { Logger } from '../utils/logger'
import { getStudents, getWarnings, prepareClub, prepareClubMember, prepareStudent, prepareWarning } from './test.utils'

jest.setTimeout(20000)

let core: ApplicationCore
let session: Session

const students = getStudents(198)
const warnings = getWarnings(998)

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
  await prepareStudent(session, ...students)
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
