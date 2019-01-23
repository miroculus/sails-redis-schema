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
      type: 'string',
      meta: { index: true },
      columnName: 'last_name'
    },
    age: {
      type: 'number',
      defaultsTo: 18
    },
    data: {
      type: 'json'
    },
    // one-to-one association via Profile.user
    profile: {
      model: 'profile'
    },
    // one-to-many association via Pokemon.owner
    pokemons: {
      collection: 'pokemon',
      via: 'owner'
    }
  }
}
