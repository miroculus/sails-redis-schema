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
})
