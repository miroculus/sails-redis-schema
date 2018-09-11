const md5 = require('./md5')

exports.getIndexKey = (tableName, attrName, attrValue = '*') =>
  `${tableName}.index:${attrName}:${attrValue === '*' ? '*' : md5(attrValue)}`

exports.getRecordKey = (tableName, recordId = '*') =>
  `${tableName}:${recordId}`
