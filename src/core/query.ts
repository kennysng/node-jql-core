import { AndExpressions, BetweenExpression, BinaryExpression, CaseExpression, checkNull, ExistsExpression, FromTable, FunctionExpression, GroupBy, InExpression, IQuery, IsNullExpression, JQL, JQLError, LikeExpression, LimitOffset, MathExpression, OrderBy, OrExpressions, ParameterExpression, Query, Unknown } from 'node-jql'
import { NoDatabaseError } from '../utils/error/NoDatabaseError'

/**
 * Reusable query with unknowns
 */
export class PreparedQuery extends Query {
  private unknowns: Unknown[] = []

  constructor(...args: any[]) {
    super(args[0], args[1], ...args.slice(2))

    // $select
    for (const { expression } of this.$select) this.registerUnknown(expression)

    // $from
    if (this.$from) for (const table of this.$from) this.registerUnknown(table)

    // $where
    if (this.$where) this.registerUnknown(this.$where)

    // $group
    if (this.$group) this.registerUnknown(this.$group)

    // $order
    if (this.$order) for (const order of this.$order) this.registerUnknown(order)

    // $limit
    if (this.$limit) this.registerUnknown(this.$limit)
  }

  /**
   * Set parameter
   * @param i [number]
   * @param value [any]
   */
  public set(i: number, value: any): PreparedQuery {
    if (checkNull(this.unknowns[i])) throw new SyntaxError(`Unknown #${i} out of bound`)
    this.unknowns[i].value = value
    return this
  }

  /**
   * Get a query with applied parameters
   */
  public commit(): Query {
    try {
      return this.clone()
    }
    finally {
      for (const unknown of this.unknowns) unknown.value = undefined
    }
  }

  private registerUnknown(jql: JQL): void {
    if (jql instanceof Query) {
      this.unknowns.push(...new PreparedQuery(jql).unknowns)
    }
    else if (jql instanceof FromTable) {
      const { table, joinClauses } = jql
      if (table instanceof Query) this.registerUnknown(table)
      for (const { table, $on } of joinClauses) {
        if (table.table instanceof Query) this.registerUnknown(table.table)
        if ($on) this.registerUnknown($on)
      }
    }
    else if (jql instanceof GroupBy) {
      const { expressions, $having } = jql
      for (const expression of expressions) this.registerUnknown(expression)
      if ($having) this.registerUnknown($having)
    }
    else if (jql instanceof LimitOffset) {
      const { $limit, $offset } = jql
      this.registerUnknown($limit)
      if ($offset) this.registerUnknown($offset)
    }
    else if (jql instanceof AndExpressions || jql instanceof OrExpressions) {
      const { expressions } = jql
      for (const expression of expressions) this.registerUnknown(expression)
    }
    else if (jql instanceof BetweenExpression) {
      const { left, start, end } = jql
      this.registerUnknown(left)
      this.registerUnknown(start)
      this.registerUnknown(end)
    }
    else if (jql instanceof BinaryExpression || jql instanceof LikeExpression || jql instanceof MathExpression) {
      const { left, right } = jql
      this.registerUnknown(left)
      this.registerUnknown(right)
    }
    else if (jql instanceof CaseExpression) {
      const { cases, $else } = jql
      for (const { $when, $then } of cases) {
        this.registerUnknown($when)
        this.registerUnknown($then)
      }
      if ($else) this.registerUnknown($else)
    }
    else if (jql instanceof ExistsExpression) {
      this.registerUnknown(jql.query)
    }
    else if (jql instanceof FunctionExpression) {
      const { parameters } = jql
      for (const { expression } of parameters) this.registerUnknown(expression)
    }
    else if (jql instanceof InExpression) {
      const { right } = jql
      this.registerUnknown(right)
    }
    else if (jql instanceof IsNullExpression) {
      const { left } = jql
      this.registerUnknown(left)
    }
    else if (jql instanceof ParameterExpression || jql instanceof OrderBy) {
      const { expression } = jql
      this.registerUnknown(expression)
    }
    else if (jql instanceof Unknown) {
      this.unknowns.push(jql)
    }
  }
}

/**
 * Analyze query for processing and optimization
 */
export class AnalyzedQuery extends Query {
  /**
   * Databases involved
   */
  public readonly databases: string[] = []

  /**
   * @param json [IQuery]
   * @param defDatabase [string] optional
   */
  constructor(json: IQuery, public readonly defDatabase?: string) {
    super(json)

    // $select
    for (const { expression } of this.$select) this.registerDatabase(expression)

    // $from
    if (this.$from) for (const table of this.$from) this.registerDatabase(table)

    // $where
    if (this.$where) this.registerDatabase(this.$where)

    // $group
    if (this.$group) this.registerDatabase(this.$group)

    // $order
    if (this.$order) for (const order of this.$order) this.registerDatabase(order)

    // $limit
    if (this.$limit) this.registerDatabase(this.$limit)

    // unique databases
    this.databases = Array.from(new Set(this.databases))
  }

  /**
   * Whether no database involved in this query
   */
  get noDatbaseInvolved(): boolean {
    return !this.databases.length
  }

  /**
   * Whether multiple databases involved in this query
   */
  get multiDatabasesInvolved(): boolean {
    return this.databases.length > 1
  }

  private registerDatabase(jql: JQL): void {
    if (jql instanceof Query) {
      this.databases.push(...new AnalyzedQuery(jql, this.defDatabase).databases)
    }
    else if (jql instanceof FromTable) {
      let { database, joinClauses } = jql
      database = database || this.defDatabase
      if (!database) throw new NoDatabaseError()
      this.databases.push(database)
      for (let { table: { database } } of joinClauses) {
        database = database || this.defDatabase
        if (!database) throw new NoDatabaseError()
        this.databases.push(database)
      }
    }
    else if (jql instanceof GroupBy) {
      const { expressions, $having } = jql
      for (const expression of expressions) this.registerDatabase(expression)
      if ($having) this.registerDatabase($having)
    }
    else if (jql instanceof LimitOffset) {
      const { $limit, $offset } = jql
      this.registerDatabase($limit)
      if ($offset) this.registerDatabase($offset)
    }
    else if (jql instanceof AndExpressions || jql instanceof OrExpressions) {
      const { expressions } = jql
      for (const expression of expressions) this.registerDatabase(expression)
    }
    else if (jql instanceof BetweenExpression) {
      const { left, start, end } = jql
      this.registerDatabase(left)
      this.registerDatabase(start)
      this.registerDatabase(end)
    }
    else if (jql instanceof BinaryExpression || jql instanceof LikeExpression || jql instanceof MathExpression) {
      const { left, right } = jql
      this.registerDatabase(left)
      this.registerDatabase(right)
    }
    else if (jql instanceof CaseExpression) {
      const { cases, $else } = jql
      for (const { $when, $then } of cases) {
        this.registerDatabase($when)
        this.registerDatabase($then)
      }
      if ($else) this.registerDatabase($else)
    }
    else if (jql instanceof ExistsExpression) {
      this.registerDatabase(jql.query)
    }
    else if (jql instanceof FunctionExpression) {
      const { parameters } = jql
      for (const { expression } of parameters) this.registerDatabase(expression)
    }
    else if (jql instanceof InExpression) {
      const { right } = jql
      this.registerDatabase(right)
    }
    else if (jql instanceof IsNullExpression) {
      const { left } = jql
      this.registerDatabase(left)
    }
    else if (jql instanceof ParameterExpression || jql instanceof OrderBy) {
      const { expression } = jql
      this.registerDatabase(expression)
    }
  }
}
