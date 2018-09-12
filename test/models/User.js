module.exports = {
  identity: 'user',
  tableName: 'user',
  datastore: 'default',
  primaryKey: 'id',

  attributes: {
    id: {
      type: 'string'
    },
    active: {
      type: 'boolean',
      defaultsTo: true,
      meta: { index: true }
    },
    age: {
      type: 'number',
      defaultsTo: 18
    },
    firstName: {
      type: 'string',
      required: true,
      meta: { index: true }
    },
    lastName: {
      type: 'string'
    }
  }
}
