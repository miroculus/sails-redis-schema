const { deepStrictEqual } = require('assert')

const sortById = (a, b) => a.id === b.id ? 0 : a.id > b.id ? 1 : -1

module.exports = (expected, given) => {
  const a = Array.isArray(expected) ? expected.sort(sortById) : expected
  const b = Array.isArray(given) ? given.sort(sortById) : given

  deepStrictEqual(a, b)
}
