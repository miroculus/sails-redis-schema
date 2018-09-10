// Delete multiple keys from a given redis connection
module.exports = (manager, keys) => new Promise((resolve, reject) => {
  const stream = manager.scanStream({ match: keys })

  stream.on('data', (keys) => {
    if (keys.length === 0) return

    const pipeline = manager.pipeline()
    keys.forEach((key) => pipeline.del(key))
    pipeline.exec()
  })

  stream.on('end', resolve)
  stream.on('error', reject)
})
