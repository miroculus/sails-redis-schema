module.exports = {
  identity: 'profile',
  tableName: 'profile',
  datastore: 'default',
  primaryKey: 'id',

  attributes: {
    id: {
      type: 'string'
    },
    bio: {
      type: 'string'
    },
    user: {
      model: 'user'
    }
  }
}
