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
    firstName: {
      type: 'string',
      required: true,
      meta: { index: true }
    },
    lastName: {
      type: 'string'
    },
    age: {
      type: 'number',
      defaultsTo: 18
    },
    data: {
      type: 'json'
    }
  }
}
