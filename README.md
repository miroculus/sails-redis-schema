# sails-redis-schema

A redis adapter for Sails / Waterline with basic schema and indexing support.

## Installation

To install this adapter, run:

```sh
npm install sails-redis-schema
```

Then, add the adapter to the `config/datastores.js` file like this:

```javascript
module.exports.datastores = {
  'redis-schema': {
    adapter: require('sails-redis-schema'),
    url: 'redis://user:password@127.0.0.1:6379' // defaults to '127.0.0.1:6379'
  }
};
```

You could also use the options field with any of the values listed here:
https://github.com/luin/ioredis/blob/HEAD/API.md#new-redisport-host-options

```javascript
module.exports.datastores = {
  'redis-schema': {
    adapter: require('sails-redis-schema'),
    options: {
      host: '192.168.1.1',
      port: 5412,
      db: 3,
      enableOfflineQueue: false
    }
  }
};
```

_More info about datastores at: https://sailsjs.com/documentation/reference/configuration/sails-config-datastores_

## Usage

_Visit [Models & ORM](https://sailsjs.com/docs/concepts/models-and-orm) in the docs for more information about using models, datastores, and adapters in your app/microservice._

## Compatibility

This adapter implements the following methods:

| Method               | Status            | Category      |
|:---------------------|:------------------|:--------------|
| registerDatastore    | _**in progress**_ | LIFECYCLE     |
| teardown             | _**in progress**_ | LIFECYCLE     |
| create               | Planned           | DML           |
| createEach           | Planned           | DML           |
| update               | Planned           | DML           |
| destroy              | Planned           | DML           |
| find                 | Planned           | DQL           |
| join                 | _**???**_         | DQL           |
| count                | Planned           | DQL           |
| sum                  | Planned           | DQL           |
| avg                  | Planned           | DQL           |
| define               | Planned           | DDL           |
| drop                 | Planned           | DDL           |
| setSequence          | _**???**_         | DDL           |

## Tests
To run the tests, first make sure to have a redis server running. Or start one
using [Docker](https://docker.com) with:

```sh
docker-compose up
```

And then, to execute the tests run (this will connect to the running redis on `127.0.0.1:6379`):
```sh
npm test
```

Or, you can use a custom redis instance setting the environment variable like this:
```sh
TEST_REDIS_URL=127.0.0.1:6379 npm test
```

## License

**MIT**
