const { describe, it } = require('mocha')
const { expect } = require('chai')
const compareResults = require('./helpers/compare-results')

describe('.find()', function () {
  it('should find one user by id', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'First',
      lastName: 'User'
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

    compareResults(result, [user1, user2])
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

    compareResults(result, [user1, user2])
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

    compareResults(result, [user1, user2])
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
})
