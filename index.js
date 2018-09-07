const Redis = require('ioredis')

const registeredDatastores = {}

module.exports = {
  // The identity of this adapter, to be referenced by datastore configurations in a Sails app.
  identity: 'sails-redis-schema',

  // Waterline Adapter API Version
  adapterApiVersion: 1,

  // Default datastore configuration.
  defaults: {
    url: null, // defaults to 127.0.0.1:6379; could be a  connection string (e.g.: 'redis://127.0.0.1:6379'), or a path to a socket (e.g.: '/tmp/redis.sock')
    options: {} // any of https://github.com/luin/ioredis/blob/HEAD/API.md#new-redisport-host-options
  },

  datastores: registeredDatastores,

  /**
   * Create a manager using the configuration provided, and track it,
   * along with the provided config (+a reference to the static driver)
   * as an active datastore.
   *
   * @param {Config} config
   * @param {Object} allKnownModelDefs
   * @param  {Function} done
   */
  registerDatastore: function (config, allKnownModelDefs, done) {
    // Grab the unique name for this datastore for easy access below.
    const { identity } = config

    if (!identity) return done(new Error('Datastore is missing an identity'))

    if (registeredDatastores[identity]) {
      return done(new Error('Datastore (`' + identity + '`) has already been registered by sails-redis'))
    }

    const manager = config.url
      ? new Redis(config.url, config.options)
      : new Redis(config.options)

    registeredDatastores[identity] = {
      driver: Redis,
      config,
      manager
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
  teardown: function (identity, done) {
    const datastore = registeredDatastores[identity]

    if (datastore === undefined) {
      return done(new Error('Attempting to tear down a datastore (`' + identity + '`) which is not currently registered with this adapter.'))
    }

    delete registeredDatastores[identity]

    datastore.manager.quit(done)
  }

  /// ///////////////////////////////////////////////////////////////////////////////////////////////
  //  ██████╗ ███╗   ███╗██╗                                                                      //
  //  ██╔══██╗████╗ ████║██║                                                                      //
  //  ██║  ██║██╔████╔██║██║                                                                      //
  //  ██║  ██║██║╚██╔╝██║██║                                                                      //
  //  ██████╔╝██║ ╚═╝ ██║███████╗                                                                 //
  //  ╚═════╝ ╚═╝     ╚═╝╚══════╝                                                                 //
  // (D)ata (M)anipulation (L)anguage                                                             //
  //                                                                                              //
  // DML adapter methods:                                                                         //
  // Methods related to manipulating records stored in the database.                              //
  /// ///////////////////////////////////////////////////////////////////////////////////////////////

  /**
   *  ╔═╗╦═╗╔═╗╔═╗╔╦╗╔═╗
   *  ║  ╠╦╝║╣ ╠═╣ ║ ║╣
   *  ╚═╝╩╚═╚═╝╩ ╩ ╩ ╚═╝
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
  // find: function (datastoreName, query, done) {
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
  //     return done(new Error('Adapter method (`find`) not implemented yet.'))
  //   }, 16)
  // },

  /**
   *   ╦╔═╗╦╔╗╔
   *   ║║ ║║║║║
   *  ╚╝╚═╝╩╝╚╝
   *  ┌─    ┌─┐┌─┐┬─┐  ┌┐┌┌─┐┌┬┐┬┬  ┬┌─┐  ┌─┐┌─┐┌─┐┬ ┬┬  ┌─┐┌┬┐┌─┐    ─┐
   *  │───  ├┤ │ │├┬┘  │││├─┤ │ │└┐┌┘├┤   ├─┘│ │├─┘│ ││  ├─┤ │ ├┤   ───│
   *  └─    └  └─┘┴└─  ┘└┘┴ ┴ ┴ ┴ └┘ └─┘  ┴  └─┘┴  └─┘┴─┘┴ ┴ ┴ └─┘    ─┘
   * Perform a "find" query with one or more native joins.
   *
   * > NOTE: If you don't want to support native joins (or if your database does not
   * > support native joins, e.g. Mongo) remove this method completely!  Without this method,
   * > Waterline will handle `.populate()` using its built-in join polyfill (aka "polypopulate"),
   * > which sends multiple queries to the adapter and joins the results in-memory.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done          Callback
   *               @param {Error?}
   *               @param {Array}  [matching physical records, populated according to the join instructions]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // join: function (datastoreName, query, done) {
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
  //     return done(new Error('Adapter method (`join`) not implemented yet.'))
  //   }, 16)
  // },

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
   *  ╔═╗╦ ╦╔╦╗
   *  ╚═╗║ ║║║║
   *  ╚═╝╚═╝╩ ╩
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done          Callback
   *               @param {Error?}
   *               @param {Number}  [the sum]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // sum: function (datastoreName, query, done) {
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
  //     return done(new Error('Adapter method (`sum`) not implemented yet.'))
  //   }, 16)
  // },

  /**
   *  ╔═╗╦  ╦╔═╗
   *  ╠═╣╚╗╔╝║ ╦
   *  ╩ ╩ ╚╝ ╚═╝
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore to perform the query on.
   * @param  {Dictionary}   query         The stage-3 query to perform.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done          Callback
   *               @param {Error?}
   *               @param {Number}  [the average ("mean")]
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // avg: function (datastoreName, query, done) {
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
  //     return done(new Error('Adapter method (`avg`) not implemented yet.'))
  //   }, 16)
  // },

  /// ///////////////////////////////////////////////////////////////////////////////////////////////
  //  ██████╗ ██████╗ ██╗                                                                         //
  //  ██╔══██╗██╔══██╗██║                                                                         //
  //  ██║  ██║██║  ██║██║                                                                         //
  //  ██║  ██║██║  ██║██║                                                                         //
  //  ██████╔╝██████╔╝███████╗                                                                    //
  //  ╚═════╝ ╚═════╝ ╚══════╝                                                                    //
  // (D)ata (D)efinition (L)anguage                                                               //
  //                                                                                              //
  // DDL adapter methods:                                                                         //
  // Methods related to modifying the underlying structure of physical models in the database.    //
  /// ///////////////////////////////////////////////////////////////////////////////////////////////

  /**
   *  ╔╦╗╔═╗╔═╗╦╔╗╔╔═╗
   *   ║║║╣ ╠╣ ║║║║║╣
   *  ═╩╝╚═╝╚  ╩╝╚╝╚═╝
   * Build a new physical model (e.g. table/etc) to use for storing records in the database.
   *
   * (This is used for schema migrations.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName The name of the datastore containing the table to define.
   * @param  {String}       tableName     The name of the table to define.
   * @param  {Dictionary}   definition    The physical model definition (not a normal Sails/Waterline model-- log this for details.)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done           Callback
   *               @param {Error?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // define: function (datastoreName, tableName, definition, done) {
  //   // Look up the datastore entry (manager/driver/config).
  //   var dsEntry = registeredDatastores[datastoreName]

  //   // Sanity check:
  //   if (dsEntry === undefined) {
  //     return done(new Error('Consistency violation: Cannot do that with datastore (`' + datastoreName + '`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at https://sailsjs.com/support.)'))
  //   }

  //   // Define the physical model (e.g. table/etc.)
  //   //
  //   // > TODO: Replace this setTimeout with real logic that calls
  //   // > `done()` when finished. (Or remove this method from the
  //   // > adapter altogether
  //   setTimeout(function () {
  //     return done(new Error('Adapter method (`define`) not implemented yet.'))
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
  // drop: function (datastoreName, tableName, unused, done) {
  //   // Look up the datastore entry (manager/driver/config).
  //   var dsEntry = registeredDatastores[datastoreName]

  //   // Sanity check:
  //   if (dsEntry === undefined) {
  //     return done(new Error('Consistency violation: Cannot do that with datastore (`' + datastoreName + '`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at https://sailsjs.com/support.)'))
  //   }

  //   // Drop the physical model (e.g. table/etc.)
  //   //
  //   // > TODO: Replace this setTimeout with real logic that calls
  //   // > `done()` when finished. (Or remove this method from the
  //   // > adapter altogether
  //   setTimeout(function () {
  //     return done(new Error('Adapter method (`drop`) not implemented yet.'))
  //   }, 16)
  // },

  /**
   *  ╔═╗╔═╗╔╦╗  ┌─┐┌─┐┌─┐ ┬ ┬┌─┐┌┐┌┌─┐┌─┐
   *  ╚═╗║╣  ║   └─┐├┤ │─┼┐│ │├┤ ││││  ├┤
   *  ╚═╝╚═╝ ╩   └─┘└─┘└─┘└└─┘└─┘┘└┘└─┘└─┘
   * Set a sequence in a physical model (specifically, the auto-incrementing
   * counter for the primary key) to the specified value.
   *
   * (This is used for schema migrations.)
   *
   * > NOTE - If your adapter doesn't support sequence entities (like PostgreSQL),
   * > you should remove this method.
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {String}       datastoreName   The name of the datastore containing the table/etc.
   * @param  {String}       sequenceName    The name of the sequence to update.
   * @param  {Number}       sequenceValue   The new value for the sequence (e.g. 1)
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   * @param  {Function}     done
   *               @param {Error?}
   * - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
   */
  // setSequence: function (datastoreName, sequenceName, sequenceValue, done) {
  //   // Look up the datastore entry (manager/driver/config).
  //   var dsEntry = registeredDatastores[datastoreName]

  //   // Sanity check:
  //   if (dsEntry === undefined) {
  //     return done(new Error('Consistency violation: Cannot do that with datastore (`' + datastoreName + '`) because no matching datastore entry is registered in this adapter!  This is usually due to a race condition (e.g. a lifecycle callback still running after the ORM has been torn down), or it could be due to a bug in this adapter.  (If you get stumped, reach out at https://sailsjs.com/support.)'))
  //   }

  //   // Update the sequence.
  //   //
  //   // > TODO: Replace this setTimeout with real logic that calls
  //   // > `done()` when finished. (Or remove this method from the
  //   // > adapter altogether
  //   setTimeout(function () {
  //     return done(new Error('Adapter method (`setSequence`) not implemented yet.'))
  //   }, 16)
  // }

}
