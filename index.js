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
    if (!!query.meta && query.meta.fetch === true) return record
  }),

  /**
   * Update matching records.
   */
  update: withDatastore(async (datastore, query) => {
    const schema = datastore.schemas[query.using]
    const { valuesToSet } = query
    const { where } = query.criteria

    const ids = await schema.fetchIds(where)

    // We should implement an update using lua, to avoid to get all the
    // modified items. In the meantime, we apply a hard limit of 100 updates at a time.
    if (ids.length > 100) {
      throw new Error(`Cannot update more than 100 items at a time.`)
    }

    await schema.updateByIds(ids, valuesToSet)

    return !!query.meta && query.meta.fetch === true
      ? schema.findByIds(ids)
      : undefined
  }),

  /**
   * Destroy one or more records.
   */
  destroy: withDatastore(async (datastore, query) => {
    const schema = datastore.schemas[query.using]
    const { where, select } = query.criteria
    const ids = await schema.fetchIds(where)

    const result = !!query.meta && query.meta.fetch === true
      ? await schema.findByIds(ids, select)
      : undefined

    await schema.destroyByIds(ids)

    return result
  }),

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
  count: withDatastore(async (datastore, query) => {
    const schema = datastore.schemas[query.using]
    const { where } = query.criteria
    const ids = await schema.fetchIds(where)
    return schema.count(ids)
  }),

  /**
   * Build a new physical model (e.g. table/etc) to use for storing records in the database.
   * We actually don't have to do nothing on redis.
   */
  define: (datastoreName, tableName, phmDef, done) => done(null),

  /**
   * Drop a physical model (table/etc.) from the database, including all of its records.
   * (This is used for schema migrations.)
   */
  drop: withDatastore(async (datastore, tableName) => {
    const schema = datastore.schemas[tableName]
    return schema.drop()
  })
}
