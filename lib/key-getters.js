const md5 = require('./md5')

exports.getIndexKey = (tableName, attrName = '*', attrValue = '*') => {
  if (attrName === '*') return `${tableName}.index:*`
  const value = attrValue === '*' ? '*' : md5(attrValue)
  return `${tableName}.index:${attrName}:${value}`
}

exports.getRecordKey = (tableName, recordId = '*') =>
  `${tableName}:${recordId}`
