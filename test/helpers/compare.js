const { fail, deepStrictEqual } = require('assert')

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
 * @param {Object} expected
 * @param {Object} given
 */
exports.recordsAreEqual = (expected, given) => {
  deepStrictEqual(given, expected, 'Given records are not equal')
}

/**
 * Assert if the given `record` is present on `records`.
 * @param {Array} records
 * @param {Object} record
 */
exports.includesRecord = (records, record) => {
  if (records.some((r) => areEqual(record, r))) return true
  deepStrictEqual(record, records, 'The given record is not present on records list')
}

/**
 * Assert if the given arrays of records are the same, disregarding
 * array order.
 * @param {Array<Object>} expected
 * @param {Array<Object>} given
 */
exports.arraysContainSameRecords = (expected, given) => {
  if (!Array.isArray(expected) || !Array.isArray(given)) {
    fail(given, expected, 'The given records lists should be array')
  }

  if (expected.length !== given.length) {
    deepStrictEqual(expected, given, 'The given records list are not the same')
  }

  given.forEach((record) => exports.includesRecord(expected, record))

  return true
}
