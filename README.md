# node-jql-core

[![npm version](https://badge.fury.io/js/node-jql-core.svg)](https://badge.fury.io/js/node-jql-core)

This is a SQL database mainly designed for providing an interface for JSON processing with the SQL syntax. It works with the syntax library [node-jql](https://github.com/kennysng/node-jql)

# Memory Engine

## PAY ATTENTION

Note: It's still under development. Please avoid using it in production

Note: It's not fully optimized, and may be slow. Please avoid doing intensive computation with this engine

Note: NodeJS version 8 or higher is highly recommended due to the native support of `async/await`

# Custom Engine

You can develop your custom engine. 