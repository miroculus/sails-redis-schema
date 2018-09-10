const { describe, it } = require('mocha')
const { expect } = require('chai')

describe('.create()', function () {
  it('should create a user on redis', async function () {
    const { User, manager } = this.ctx

    const user = await User.create({
      firstName: 'Sarasa',
      lastName: 'Pirulo'
    }).fetch()

    expect(user.id).to.be.a('string')
    expect(user.firstName).to.equal('Sarasa')
    expect(user.lastName).to.equal('Pirulo')

    // Check saved value on DB
    const result = await manager.hgetall(`user:${user.id}`)
    expect(result).to.be.eql(user)

    // Check it indexed the firstName
    const isIndexed = await manager.sismember(`user.index:firstName`, user.id)
    expect(isIndexed).to.be.equal(1)
  })
})
