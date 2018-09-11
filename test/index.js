const { before, after } = require('mocha')
const Waterline = require('waterline')
const sailsRedisSchemaAdapter = require('../')

before(function (done) {
  const ctx = {}

  this.ctx = ctx

  const waterline = new Waterline()

  const config = {
    adapters: {
      'redis-schema': sailsRedisSchemaAdapter
    },

    datastores: {
      default: {
        adapter: 'redis-schema',
        url: process.env.TEST_REDIS_URL || null
      }
    }
  }

  const UserCollection = Waterline.Collection.extend(require('./models/User'))

  waterline.registerModel(UserCollection)

  waterline.initialize(config, (err, ontology) => {
    if (err) return done(err)

    ctx.User = ontology.collections.user

    done()
  })
})

before(async function () {
  this.ctx.manager = sailsRedisSchemaAdapter.datastores['default'].manager
})

before(async function () {
  await this.ctx.manager.flushall()
})

after((done) => sailsRedisSchemaAdapter.teardown('default', done))
