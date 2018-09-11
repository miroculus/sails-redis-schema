const { describe, it } = require('mocha')
const { expect } = require('chai')

describe('.count()', function () {
  it('should count the given users', async function () {
    const { User } = this.ctx

    const user1 = await User.create({
      firstName: 'Sarasa',
      lastName: 'Pirulo'
    }).fetch()

    const user2 = await User.create({
      firstName: 'Sarasa',
      lastName: 'Pirulo'
    }).fetch()

    const count = await User.count({ id: [user1.id, user2.id] })

    expect(count).to.be.equal(2)
  })
})
