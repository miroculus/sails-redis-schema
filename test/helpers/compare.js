const { deepStrictEqual } = require('assert')

const sortById = (a, b) => a.id === b.id ? 0 : a.id > b.id ? 1 : -1

const areEqual = (a, b) => {
  try {
    deepStrictEqual(a, b)
    return true
  } catch (_) {
    return false
  }
}

/**
 * Assert if the given records or array of records are the same, disregarding
 * array order.
 * @param {Array<Object>|Object} expected
 * @param {Array<Object>|Object} given
 */
exports.recordsAreEqual = (expected, given) => {
  const a = Array.isArray(expected) ? expected.sort(sortById) : expected
  const b = Array.isArray(given) ? given.sort(sortById) : given

  deepStrictEqual(a, b)
}

/**
 * Assert if the given `record` is present on `records`.
 * @param {Array} records
 * @param {Object} record
 */
exports.includesRecord = (records, record) => {
  if (records.some((r) => areEqual(record, r))) return
  deepStrictEqual(records, record, 'The given record is not present on records')
}
