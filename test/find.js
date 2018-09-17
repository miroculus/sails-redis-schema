const { describe, it } = require('mocha')
const { expect } = require('chai')
const createEach = require('./helpers/create-each')
const {
  recordsAreEqual,
  includesRecord,
  arrayRecordsAreEqual
} = require('./helpers/compare')

describe('.find()', function () {
  it('should find one user by id', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'First',
      lastName: 'User',
      data: { one: 1 }
    }).fetch()

    const result = await User.findOne({ id: user.id })

    expect(result).to.be.eql(user)
  })

  it('should find multiple users by ids', async function () {
    const { User } = this.ctx

    const user1 = await User.create({
      firstName: 'Name',
      lastName: 'User'
    }).fetch()

    const user2 = await User.create({
      firstName: 'Name',
      lastName: 'User'
    }).fetch()

    const result = await User.find({ id: [user1.id, user2.id] })

    recordsAreEqual(result, [user1, user2])
  })

  it('should find one user by firstName', async function () {
    const { User } = this.ctx

    const firstName = `The name ${Date.now()}`

    const user = await User.create({ firstName }).fetch()
    const result = await User.findOne({ firstName })

    expect(result).to.be.eql(user)
  })

  it('should find multiple users with the same firstName', async function () {
    const { User } = this.ctx

    const firstName = `The name ${Date.now()}`

    const user1 = await User.create({ firstName }).fetch()
    const user2 = await User.create({ firstName }).fetch()

    const result = await User.find({ firstName })

    arrayRecordsAreEqual(result, [user1, user2])
  })

  it('should find multiple users with different firstNames', async function () {
    const { User } = this.ctx

    const user1 = await User.create({
      firstName: `The name ${Date.now()}`
    }).fetch()

    const user2 = await User.create({
      firstName: `Another name ${Date.now()}`
    }).fetch()

    const result = await User.find({
      firstName: [user1.firstName, user2.firstName]
    })

    arrayRecordsAreEqual(result, [user1, user2])
  })

  it('should select given keys', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'First',
      lastName: 'User'
    }).fetch()

    const result = await User.findOne({
      where: { id: user.id },
      select: ['id', 'firstName']
    })

    expect(result).to.be.eql({ id: user.id, firstName: user.firstName })
  })

  it('should find user by boolean field', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'First',
      active: false
    }).fetch()

    const results = await User.find({ active: false })

    includesRecord(results, user)
  })

  it('should populate user profile', async function () {
    const { User, Profile } = this.ctx

    const user = await User.create({
      firstName: 'Some',
      lastName: 'User'
    }).fetch()

    const profile = await Profile.create({
      bio: 'Some bio',
      user: user.id
    }).fetch()

    await User.update({ id: user.id }, { profile: profile.id })

    const result = await User.findOne({ id: user.id }).populate('profile')

    recordsAreEqual(result, {
      ...user,
      profile
    })
  })

  it('should find one-to-many associated Pokemons', async function () {
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

    const result = await User.findOne({ id: user.id }).populate('pokemons')

    arrayRecordsAreEqual(result.pokemons, pokemons)
  })
})
