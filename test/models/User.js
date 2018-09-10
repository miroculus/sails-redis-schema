module.exports = {
  identity: 'user',
  tableName: 'user',
  datastore: 'default',
  primaryKey: 'id',

  attributes: {
    id: {
      type: 'string'
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
