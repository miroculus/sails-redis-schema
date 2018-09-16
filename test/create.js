const { describe, it } = require('mocha')
const { expect } = require('chai')
const stringify = require('fast-json-stable-stringify')
const md5 = require('../lib/md5')
const { unserializeRecord } = require('../lib/serializer')
const { recordsAreEqual } = require('./helpers/compare')
const createEach = require('./helpers/create-each')

describe('.create()', function () {
  it('should create a user', async function () {
    const { User, manager } = this.ctx

    const data = {
      one: 1,
      two: 2,
      three: '3'
    }

    const user = await User.create({
      firstName: 'Sarasa',
      lastName: 'Pirulo',
      active: false,
      data
    }).fetch()

    expect(user.id).to.be.a('string')
    expect(user.firstName).to.be.equal('Sarasa')
    expect(user.lastName).to.be.equal('Pirulo')
    expect(user.active).to.be.equal(false)
    recordsAreEqual(user.data, data)

    // Check saved value on DB
    const result = await manager.hgetall(`user:${user.id}`)
    expect(unserializeRecord(User.attributes, result)).to.be.eql(user)

    // Check json type data is saved on redis as a JSON string
    const jsonData = await manager.hget(`user:${user.id}`, 'data')
    expect(jsonData).to.be.equal(stringify(data))

    // Check it indexed the firstName
    const indexKey = md5(user.firstName)
    const isIndexed = await manager.sismember(`user.index:firstName:${indexKey}`, user.id)
    expect(isIndexed).to.be.equal(1)
  })

  it('should not create a repeated user', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'Some',
      lastName: 'User'
    }).fetch()

    try {
      await User.create({
        id: user.id,
        firstName: 'Another',
        lastName: 'User'
      }).fetch()
    } catch (err) {
      expect(err.raw.code).to.be.equal('E_UNIQUE')
    }
  })

  it('should create user with data null', async function () {
    const { User } = this.ctx
    const user = await User.create({ firstName: 'Simple' }).fetch()
    expect(user.data).to.be.equal(null)
  })

  it('should create one-to-one associated Profile', async function () {
    const { User, Profile } = this.ctx

    const user = await User.create({
      firstName: 'Some',
      lastName: 'User'
    }).fetch()

    const profile = await Profile.create({
      bio: 'Some biograpghy',
      user: user.id
    }).fetch()

    recordsAreEqual(profile, {
      id: profile.id,
      bio: 'Some biograpghy',
      user: user.id
    })
  })

  it('should create one-to-many associated Pokemons', async function () {
    const { User, Pokemon } = this.ctx

    const user = await User.create({
      firstName: 'Ash',
      lastName: 'Ketchum'
    }).fetch()

    const owner = user.id

    const pokemons = await createEach(Pokemon, [
      { name: 'Ratata', owner },
      { name: 'Pidgey', owner }
    ])

    recordsAreEqual(pokemons, [
      { id: pokemons[0].id, name: 'Ratata', owner },
      { id: pokemons[1].id, name: 'Pidgey', owner }
    ])
  })
})
