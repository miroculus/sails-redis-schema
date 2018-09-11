const { callbackify } = require('util')
const Redis = require('ioredis')
const createManager = require('./lib/create-manager')
const RedisSchema = require('./lib/redis-schema')

const registeredDatastores = {}

const withDatastore = (fn) => callbackify((datastoreName, ...restParams) => {
  const datastore = registeredDatastores[datastoreName]

  if (datastore === undefined) {
    throw new Error('Datastore (`' + datastoreName + '`) is not currently registered with this adapter.')
  }

  return fn(datastore, ...restParams)
})

module.exports = {
  // The identity of this adapter, to be referenced by datastore configurations in a Sails app.
  identity: 'sails-redis-schema',

  // Waterline Adapter API Version
  adapterApiVersion: 1,

  // Default datastore configuration.
  defaults: {
    url: null, // defaults to 127.0.0.1:6379; could be a  connection string (e.g.: 'redis://127.0.0.1:6379'), or a path to a socket (e.g.: '/tmp/redis.sock'),
    options: {} // any of https://github.com/luin/ioredis/blob/HEAD/API.md#new-redisport-host-options
  },

  datastores: registeredDatastores,

  /**
   * Create a manager using the configuration provided, and track it,
   * along with the provided config (+a reference to the static driver)
   * as an active datastore.
   *
   * @param {Config} config
   * @param {Object} models
   * @param  {Function} done
   */
  registerDatastore: callbackify(async (config, models) => {
    // Grab the unique name for this datastore for easy access below.
    const { identity } = config

    if (!identity) throw new Error('Datastore is missing an identity.')

    if (registeredDatastores[identity]) {
      throw new Error('Datastore (`' + identity + '`) has already been registered by sails-redis.')
    }

    const options = config.url
      ? { url: config.url, ...config.options }
      : config.options

    const manager = await createManager(options)

    const schemas = {}

    Object.values(models).forEach((schema) => {
      schemas[schema.tableName] = new RedisSchema(schema, manager)
    })

    const datastore = {
      driver: Redis,
      config,
      manager,
      models,
      schemas
    }

    registeredDatastores[identity] = datastore

    return datastore
  }),

  /**
   * Unregister the specified datastore, so that is no longer considered active,
   * and its manager is destroyed (& thus all of its live db connections are released.)
   *
   * @param {String} identity
   * @param {Function} done
   */
  teardown: withDatastore((datastore) => {
    delete registeredDatastores[datastore.config.identity]
    return datastore.manager.quit()
  }),

  /**
   * Create a new record.
   */
  create: withDatastore(async (datastore, query) => {
    const schema = datastore.schemas[query.using]
    const record = await schema.create(query.newRecord)
    if (!!query.meta && !!query.meta.fetch) return record
  }),

  /**
   * Update matching records.
   */
  // update: withDatastore(async (datastore, query) => {
  //   const { manager } = datastore
  //   const shouldFetch = !!query.meta.fetch
  //   const model = datastore.models[query.using]
  //   const indexes = datastore.indexes[model.tableName]

  //   const ids = await getQueryIds(manager, model, indexes, query.where)

  //   console.log('-->', query)
  //   console.log('-->', ids)
  // }),

  /**
   * Destroy one or more records.
   */
  // destroy: withDatastore(async (datastore, query) => {
  //   const { manager } = datastore
  //   const { criteria } = query
  //   const { where, select } = criteria
  //   const shouldFetch = !!query.meta && !!query.meta.fetch
  //   const model = datastore.models[query.using]
  //   const { tableName } = model
  //   const indexes = datastore.indexes[model.tableName]

  //   const ids = await parseQuery(manager, model, indexes, where)
  //   const keys = ids.map((id) => getRecordKey(tableName, id))

  //   const results = await manager
  //     .pipeline(keys.map((k) => ['hmget', k, ...select]))
  //     .exec()

  //   const records = results.map(([, values]) => {
  //     const result = values.reduce((result, value, index) => {
  //       result[select[index]] = value
  //       return result
  //     }, {})

  //     return parseResult(model.definition, result)
  //   })

  //   return records
  // }),

  /**
   * Find matching records.
   */
  find: withDatastore(async (datastore, query) => {
    const schema = datastore.schemas[query.using]
    return schema.find(query.criteria)
  }),

  /**
   * Get the number of matching records.
   */
  // count: function (datastoreName, query, done) {
  //   // Look up the datastore entry (manager/driver/config).
  //   var dsEntry = registeredDatastores[datastoreName]

  //   // Sanity check:
  //   if (dsEntry === undefined) {
  //     return done(new Error('Consistency violation: Cannot do that with datastore (`' + datastoreName + '`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at https://sailsjs.com/support.)'))
  //   }

  //   // Perform the query and send back a result.
  //   //
  //   // > TODO: Replace this setTimeout with real logic that calls
  //   // > `done()` when finished. (Or remove this method from the
  //   // > adapter altogether
  //   setTimeout(function () {
  //     return done(new Error('Adapter method (`count`) not implemented yet.'))
  //   }, 16)
  // },

  /**
   * Drop a physical model (table/etc.) from the database, including all of its records.
   * (This is used for schema migrations.)
   */
  drop: withDatastore(async (datastore, tableName) => {
    const schema = datastore.schemas[tableName]
    return schema.drop()
  })
}
