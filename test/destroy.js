const { describe, it } = require('mocha')
const { expect } = require('chai')

describe('.destroy()', function () {
  it('should destroy a user', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'Sarasa',
      lastName: 'Pirulo'
    }).fetch()

    await User.destroy({ id: user.id })

    const result = await User.findOne({ id: user.id })

    expect(result).to.be.equal(undefined)
  })

  it('should destroy multiple users by firstName', async function () {
    const { User } = this.ctx

    const firstName = `The User ${Date.now()}`
    await User.create({ firstName }).fetch()
    await User.create({ firstName }).fetch()

    await User.destroy({ firstName })

    const result = await User.find({ firstName })

    expect(result).to.be.eql([])
  })

  it('should destroy a user and fetch it', async function () {
    const { User } = this.ctx

    const user = await User.create({
      firstName: 'Sarasa',
      lastName: 'Pirulo'
    }).fetch()

    const result = await User.destroy({ id: user.id }).fetch()

    expect(result[0]).to.be.eql(user)
  })
})
