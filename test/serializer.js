const { describe, it } = require('mocha')
const { expect } = require('chai')
const { attributes } = require('./models/User')
const { recordsAreEqual } = require('./helpers/compare')
const { serializeRecord, unserializeRecord } = require('../lib/serializer')

const origin = {
  id: '123i9213123',
  active: true,
  firstName: 'Ada',
  lastName: 'Lovelace',
  age: 36,
  data: { some: 'Data', a: 'b' }
}

const target = {
  id: '123i9213123',
  active: 'true',
  firstName: 'Ada',
  last_name: 'Lovelace',
  age: '36',
  // eslint-disable-next-line no-useless-escape
  data: '{\"a\":\"b\",\"some\":\"Data\"}'
}

describe('lib/serializer', () => {
  describe('.serializeRecord()', () => {
    it('should serialize object', () => {
      const result = serializeRecord(attributes, origin)
      recordsAreEqual(target, result)
    })

    it('should serialize non-required empty string as undefined', () => {
      const record = { ...origin }
      delete record.lastName
      const expected = { ...target }
      delete expected.last_name

      const result = serializeRecord(attributes, record)
      recordsAreEqual(expected, result)
    })

    it('should not serialize empty json as "null"', () => {
      const attrs = { data: { type: 'json' } }
      const record = { data: '' }

      const result = serializeRecord(attrs, record)
      expect(result.hasOwnProperty('data')).to.be.equal(false)
    })
  })

  describe('.unserializeRecord()', () => {
    it('should unserialize object', () => {
      const result = unserializeRecord(attributes, target)
      recordsAreEqual(origin, result)
    })

    it('should unserialize non-required empty string as undefined', () => {
      const record = { ...target }
      delete record.last_name
      const expected = { ...origin }
      delete expected.lastName

      const result = unserializeRecord(attributes, record)
      recordsAreEqual(expected, result)
    })

    it('should unserialize empty json as empty value', () => {
      const attrs = { data: { type: 'json' } }
      const record = { data: '' }

      const result = unserializeRecord(attrs, record)
      expect(result.hasOwnProperty('data')).to.be.equal(false)
    })
  })
})
