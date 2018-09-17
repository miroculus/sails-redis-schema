# sails-redis-schema

A redis adapter for Sails / Waterline with basic schema and indexing support.

This adapter is intended to be used with models with very simple attributes
(only `number`, `boolean`, `string` and `json` types are supported) and to do very simple queries,
if you need something more complex you should be considering not using redis
and move to a full featured DB like MongoDB, PostgreSQL, etc.

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

In most cases I added easy to understand errors, but as a rule of thumb, if
some functionality is not listed here is probably because is not implemented.
Keep in mind that I tried to implement this adapter as minimal as possible.

### Model Definition

First, define your model and configure it to use the `redis-schema` datastore
like this:

```javascript
module.exports = {
  identity: 'user',
  datastore: 'redis-schema',
  attributes: {
    id: {
      type: 'string'
    },
    age: {
      type: 'number',
      defaultsTo: 18,
      meta: { index: true }
    },
    firstName: {
      type: 'string',
      required: true,
      meta: { index: true }
    },
    lastName: {
      type: 'string'
    }
  }
}
```

Things to keep in mind:
* For now, only the `type`'s `number`, `boolean`, `string` and `json` are allowed.
* If you want to query your model using other attribute than the `primaryKey`,
  you have to index it, to do so, do the same as we did with `firstName`,
  and add:
  ```javascript
    meta: { index: true }
  ```

### .find()

The find method only allows to query items using only 1 attribute; you won't
be able to do composed querys like: `{ firstName: 'Ada', age: 20 }`.

Also, don't forget to add the `meta: { index: true }` to all the attributes that
you want to use to query items.

Examples:

```javascript
// Correct
User.find({ id: '123123123' }) // Find users with id '123123123'
User.find({ firstName: 'Mark' }) // Find users named 'Mark'
User.find({ firstName: ['Mark', 'Ada'] }) // Find users named `Mark` or `Ada`

// Select fields
User.find({
  where: { firstName: ['Mark', 'Ada'] }
  select: ['firstName', 'lastName']
})

// Incorrect
User.find({ firstName: 'Mark', age: 20 }) // Throws an error
```

### .create()

The create method works as expected. And, if you don't define an `id`, we will
create one for you using [`shortid`](https://npmjs.com/package/shortid).

Examples:

```javascript
const ada = await User.create({
  firstName: 'Ada',
  lastName: 'Lovelace',
  age: 36
}).fetch()
```

### .destroy()

Destroys one or multiple items, query rules apply the same as `.find()`.

```javascript
const deletedItems = await User.destroy({
  firstName: ['Mark', 'Ada']
}).fetch()
```

👆 Deletes all users named "Mark" or "Ada", and, in this case we added the
`.fetch()` call so it will bring back all the deleted items.

### .update()

Updates one or multiple items, query rules apply the same as `.find()`.

```javascript
await User.update({
  firstName: 'Mark',
}, {
  age: 32
})
```

👆 Changes the age of all users named "Mark" to be `32` years old.

### .count()

The same as `.find()`, but returns the amount of queried items.

```javascript
const marksCount = await User.count({ firstName: 'Mark' })

// `There are ${marksCount} marks.`
```

### More Info

Visit [Models & ORM](https://sailsjs.com/docs/concepts/models-and-orm) in the
docs for more information about using models, datastores, and adapters
in your app/microservice.

## Tests
To run the tests, first make sure to have a redis server running. Or start one
using [Docker](https://docker.com) with:

```sh
docker-compose up
```

And then, to execute the tests run (this will connect to the running redis on `127.0.0.1:6378`):
```sh
npm test
```

Or, you can use a custom redis instance setting the environment variable like this:
```sh
TEST_REDIS_URL=127.0.0.1:6379 npm test
```

## License

**MIT**
