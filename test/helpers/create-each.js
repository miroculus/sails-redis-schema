module.exports = (Model, records) => Promise.all(
  records.map((record) => Model.create(record).fetch())
)
