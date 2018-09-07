const { callbackify } = require('util')
const Redis = require('ioredis')

const registeredDatastores = {}

const withDatastore = (fn) => callbackify((datastoreName, ...restParams) => {
  const datastore = registeredDatastores[datastoreName]

  if (datastore === undefined) {
    throw new Error('Datastore (`' + datastoreName + '`) is not currently registered with this adapter.')
  }

  return fn(datastore, ...restParams)
})

const deleteKeys = (manager, keys) => new Promise((resolve, reject) => {
  const stream = manager.scanStream({ match: keys })

  stream.on('data', (keys) => {
    if (keys.length === 0) return

    const pipeline = manager.pipeline()
    keys.forEach((key) => pipeline.del(key))
    pipeline.exec()
  })

  stream.on('end', resolve)
  stream.on('error', reject)
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
  registerDatastore: (config, models, done) => {
    // Grab the unique name for this datastore for easy access below.
    const { identity } = config

    if (!identity) return done(new Error('Datastore is missing an identity'))

    if (registeredDatastores[identity]) {
      return done(new Error('Datastore (`' + identity + '`) has already been registered by sails-redis'))
    }

    const manager = config.url
      ? new Redis(config.url, config.options)
      : new Redis(config.options)

    const indexes = {}
    const uniques = {}

    Object.values(models).forEach((model) => {
      indexes[model.tableName] = []
      uniques[model.tableName] = []

      Object.values(model.definitions).forEach((attr) => {
        if (attr.unique === true) indexes[model.tableName].push(attr.columnName)
        if (attr.index === true) uniques[model.tableName].push(attr.columnName)
      })
    })

    registeredDatastores[identity] = {
      driver: Redis,
      config,
      manager,
      models,
      indexes,
      uniques
    }

    const readyEvent = config.options.enableReadyCheck === false
      ? 'connect'
      : 'ready'

    const onReady = () => {
      done(null, registeredDatastores[identity])
      manager.off('error', onError)
    }

    const onError = (err) => {
      done(err)
      manager.off(readyEvent, onReady)
    }

    manager.once(readyEvent, onReady)
    manager.once('error', onError)
  },

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
   *
   * (e.g. add a new row to a SQL table, or a new document to a MongoDB collection.)
   *
   * > Note that depending on the value of `query.meta.fetch`,
   * > you may be expected to return the physical record that was
   * > created (a dictionary) as the second argument to the callback.
   * > (Otherwise, exclude the 2nd argument or send back `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done          Callback
   *               @param {Error?}
   *               @param {Dictionary?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // create: function (datastoreName, query, done) {
  //   // Look up the datastore entry (manager/driver/config).
  //   var dsEntry = registeredDatastores[datastoreName]

  //   console.log('->', query)

  //   // Sanity check:
  //   if (dsEntry === undefined) {
  //     return done(new Error('Consistency violation: Cannot do that with datastore (`' + datastoreName + '`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at https://sailsjs.com/support.)'))
  //   }

  //   // Perform the query (and if relevant, send back a result.)
  //   //
  //   // > TODO: Replace this setTimeout with real logic that calls
  //   // > `done()` when finished. (Or remove this method from the
  //   // > adapter altogether
  //   setTimeout(function () {
  //     return done(new Error('Adapter method (`create`) not implemented yet.'))
  //   }, 16)
  // },

  /**
   *  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗  ╔═╗╔═╗╔═╗╦ ╦
   *  ║  ╠╦╝║╣ ╠═╣ ║ ║╣   ║╣ ╠═╣║  ╠═╣
   *  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝  ╚═╝╩ ╩╚═╝╩ ╩
   * Create multiple new records.
   *
   * > Note that depending on the value of `query.meta.fetch`,
   * > you may be expected to return the array of physical records
   * > that were created as the second argument to the callback.
   * > (Otherwise, exclude the 2nd argument or send back `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // createEach: function (datastoreName, query, done) {
  //   // Look up the datastore entry (manager/driver/config).
  //   var dsEntry = registeredDatastores[datastoreName]

  //   // Sanity check:
  //   if (dsEntry === undefined) {
  //     return done(new Error('Consistency violation: Cannot do that with datastore (`' + datastoreName + '`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at https://sailsjs.com/support.)'))
  //   }

  //   // Perform the query (and if relevant, send back a result.)
  //   //
  //   // > TODO: Replace this setTimeout with real logic that calls
  //   // > `done()` when finished. (Or remove this method from the
  //   // > adapter altogether
  //   setTimeout(function () {
  //     return done(new Error('Adapter method (`createEach`) not implemented yet.'))
  //   }, 16)
  // },

  /**
   *  ╦ ╦╔═╗╔╦╗╔═╗╔╦╗╔═╗
   *  ║ ║╠═╝ ║║╠═╣ ║ ║╣
   *  ╚═╝╩  ═╩╝╩ ╩ ╩ ╚═╝
   * Update matching records.
   *
   * > Note that depending on the value of `query.meta.fetch`,
   * > you may be expected to return the array of physical records
   * > that were updated as the second argument to the callback.
   * > (Otherwise, exclude the 2nd argument or send back `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // update: function (datastoreName, query, done) {
  //   // Look up the datastore entry (manager/driver/config).
  //   var dsEntry = registeredDatastores[datastoreName]

  //   // Sanity check:
  //   if (dsEntry === undefined) {
  //     return done(new Error('Consistency violation: Cannot do that with datastore (`' + datastoreName + '`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at https://sailsjs.com/support.)'))
  //   }

  //   // Perform the query (and if relevant, send back a result.)
  //   //
  //   // > TODO: Replace this setTimeout with real logic that calls
  //   // > `done()` when finished. (Or remove this method from the
  //   // > adapter altogether
  //   setTimeout(function () {
  //     return done(new Error('Adapter method (`update`) not implemented yet.'))
  //   }, 16)
  // },

  /**
   *  ╔╦╗╔═╗╔═╗╔╦╗╦═╗╔═╗╦ ╦
   *   ║║║╣ ╚═╗ ║ ╠╦╝║ ║╚╦╝
   *  ═╩╝╚═╝╚═╝ ╩ ╩╚═╚═╝ ╩
   * Destroy one or more records.
   *
   * > Note that depending on the value of `query.meta.fetch`,
   * > you may be expected to return the array of physical records
   * > that were destroyed as the second argument to the callback.
   * > (Otherwise, exclude the 2nd argument or send back `undefined`.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // destroy: function (datastoreName, query, done) {
  //   // Look up the datastore entry (manager/driver/config).
  //   var dsEntry = registeredDatastores[datastoreName]

  //   // Sanity check:
  //   if (dsEntry === undefined) {
  //     return done(new Error('Consistency violation: Cannot do that with datastore (`' + datastoreName + '`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at https://sailsjs.com/support.)'))
  //   }

  //   // Perform the query (and if relevant, send back a result.)
  //   //
  //   // > TODO: Replace this setTimeout with real logic that calls
  //   // > `done()` when finished. (Or remove this method from the
  //   // > adapter altogether
  //   setTimeout(function () {
  //     return done(new Error('Adapter method (`destroy`) not implemented yet.'))
  //   }, 16)
  // },

  /// ///////////////////////////////////////////////////////////////////////////////////////////////
  //  ██████╗  ██████╗ ██╗                                                                        //
  //  ██╔══██╗██╔═══██╗██║                                                                        //
  //  ██║  ██║██║   ██║██║                                                                        //
  //  ██║  ██║██║▄▄ ██║██║                                                                        //
  //  ██████╔╝╚██████╔╝███████╗                                                                   //
  //  ╚═════╝  ╚══▀▀═╝ ╚══════╝                                                                   //
  // (D)ata (Q)uery (L)anguage                                                                    //
  //                                                                                              //
  // DQL adapter methods:                                                                         //
  // Methods related to fetching information from the database (e.g. finding stored records).     //
  /// ///////////////////////////////////////////////////////////////////////////////////////////////

  /**
   *  ╔═╗╦╔╗╔╔╦╗
   *  ╠╣ ║║║║ ║║
   *  ╚  ╩╝╚╝═╩╝
   * Find matching records.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done            Callback
   *               @param {Error?}
   *               @param {Array}  [matching physical records]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  find: withDatastore((datastore, query) => {
    console.log('--> ', 'find: ', datastore.config.identity, query)
    throw new Error('Adapter method (`find`) not implemented yet.')
  }),

  /**
   *  ╔═╗╔═╗╦ ╦╔╗╔╔╦╗
   *  ║  ║ ║║ ║║║║ ║
   *  ╚═╝╚═╝╚═╝╝╚╝ ╩
   * Get the number of matching records.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done          Callback
   *               @param {Error?}
   *               @param {Number}  [the number of matching records]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
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
   *  ╔╦╗╦═╗╔═╗╔═╗
   *   ║║╠╦╝║ ║╠═╝
   *  ═╩╝╩╚═╚═╝╩
   * Drop a physical model (table/etc.) from the database, including all of its records.
   *
   * (This is used for schema migrations.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore containing the table to drop.
   * @param  {String}       tableName     The name of the table to drop.
   * @param  {Ref}          unused        Currently unused (do not use this argument.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done          Callback
   *               @param {Error?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  drop: withDatastore((datastore, tableName) => {
    const { manager } = datastore
    const indexes = datastore.indexes[tableName]

    const indexesDeletion = Promise.all(
      indexes.map(
        (attrName) => manager.del(`${tableName}.index:${attrName}`)
      )
    )

    return Promise.all([
      deleteKeys(manager, `${tableName}:*`),
      indexesDeletion
    ])
  })
}
