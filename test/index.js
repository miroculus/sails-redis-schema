const { before, after } = require('mocha')
const Waterline = require('waterline')
const sailsRedisSchemaAdapter = require('../')

const models = [
  'User',
  'Profile'
]

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

  models.forEach((model) => {
    const Model = Waterline.Collection.extend(require(`./models/${model}`))
    waterline.registerModel(Model)
  })

  waterline.initialize(config, (err, ontology) => {
    if (err) return done(err)

    models.forEach((model) => {
      const { identity } = require(`./models/${model}`)
      ctx[model] = ontology.collections[identity]
    })

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
