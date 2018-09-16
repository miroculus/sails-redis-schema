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
    // one-to-one association via User.profile
    user: {
      model: 'user'
    }
  }
}
