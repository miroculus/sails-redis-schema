const { describe, it } = require('mocha')
const { expect } = require('chai')
const { recordsAreEqual } = require('./helpers/compare')
const { userIndexExists } = require('./helpers/redis')

describe('.update()', function () {
  it('should update a user', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'Sarasa'
    }).fetch()

    const changes = {
      lastName: 'Second',
      age: 22
    }

    await User.update({ id: user.id }, changes)

    const result = await User.findOne({ id: user.id })

    expect(result).to.be.eql({ ...user, ...changes })
  })

  it('should delete a key', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'A name',
      lastName: 'The last name'
    }).fetch()

    const [result] = await User.update({
      id: user.id
    }, {
      lastName: ''
    }).fetch()

    expect(result.hasOwnProperty('lastName')).to.be.equal(false)
  })

  it('should not update a not existant user', async function () {
    const { User } = this.ctx

    const id = `non-existant-${Date.now()}`
    const changes = {
      firstName: `Some user ${Date.now()}`,
      lastName: 'Second'
    }

    await User.update({ id }, changes)

    const result = await User.findOne({ id })

    expect(result).to.be.equal(undefined)
  })

  it('should update multiple users', async function () {
    const { User } = this.ctx

    const user1 = await User.create({
      firstName: 'First User'
    }).fetch()

    const user2 = await User.create({
      firstName: 'Second User'
    }).fetch()

    const changes = {
      lastName: `Second ${Date.now()}`,
      age: 22
    }

    await User.update({ id: [user1.id, user2.id] }, changes)

    const result = await User.find({ id: [user1.id, user2.id] })

    recordsAreEqual(result, [
      { ...user1, ...changes },
      { ...user2, ...changes }
    ])
  })

  it('should update string indexes', async function () {
    const { User, manager } = this.ctx

    const user = await User.create({
      firstName: 'A name'
    }).fetch()

    const [result] = await User.update({
      id: user.id
    }, {
      firstName: 'New name'
    }).fetch()

    expect(await userIndexExists(manager, user, 'firstName')).to.be.equal(false)
    expect(await userIndexExists(manager, result, 'firstName')).to.be.equal(true)
  })

  it('should update boolean indexes', async function () {
    const { User, manager } = this.ctx

    const user = await User.create({
      firstName: 'First User',
      active: true
    }).fetch()

    const [result] = await User.update({
      id: user.id
    }, {
      active: false
    }).fetch()

    expect(await userIndexExists(manager, user, 'active')).to.be.equal(false)
    expect(await userIndexExists(manager, result, 'active')).to.be.equal(true)
  })

  it('should destroy indexes on attr deletion', async function () {
    const { User, manager } = this.ctx

    const user = await User.create({
      firstName: 'A name',
      lastName: 'The last name'
    }).fetch()

    await User.update({
      id: user.id
    }, {
      lastName: ''
    })

    expect(await userIndexExists(manager, user, 'lastName')).to.be.equal(false)
  })
})
