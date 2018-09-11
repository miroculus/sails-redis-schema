const { describe, it } = require('mocha')
const { expect } = require('chai')
const md5 = require('../lib/md5')
const parseResult = require('../lib/parse-result')

describe('.create()', function () {
  it('should create a user', async function () {
    const { User, manager } = this.ctx

    const user = await User.create({
      firstName: 'Sarasa',
      lastName: 'Pirulo'
    }).fetch()

    expect(user.id).to.be.a('string')
    expect(user.firstName).to.be.equal('Sarasa')
    expect(user.lastName).to.be.equal('Pirulo')

    // Check saved value on DB
    const result = await manager.hgetall(`user:${user.id}`)
    expect(parseResult(User.attributes, result)).to.be.eql(user)

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
})
