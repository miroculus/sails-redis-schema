module.exports = {
  identity: 'pokemon',
  tableName: 'pokemon',
  datastore: 'default',
  primaryKey: 'id',

  attributes: {
    id: {
      type: 'string'
    },
    name: {
      type: 'string',
      required: true
    },
    // one-to-many association via User.pokemons
    owner: {
      model: 'user'
    }
  }
}
