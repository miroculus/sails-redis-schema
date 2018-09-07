#!/usr/bin/env node

/**
 * Module dependencies
 */

var TestRunner = require('waterline-adapter-tests')
var packageMD = require('../package.json')
var Adapter = require('../')

// Log an intro message.
console.log('Testing `' + packageMD.name + '`, a Sails/Waterline adapter.')
console.log('Running `waterline-adapter-tests` against ' + packageMD.waterlineAdapter.interfaces.length + ' interface(s) and ' + packageMD.waterlineAdapter.features.length + ' feature(s)...')
console.log('|   Interfaces:       ' + (packageMD.waterlineAdapter.interfaces.join(', ') || 'n/a') + '')
console.log('|   Extra features:   ' + (packageMD.waterlineAdapter.features.join(', ') || 'n/a') + '')
console.log()

// Use the `waterline-adapter-tests` module to
// run mocha tests against the specified interfaces
// of the currently-implemented Waterline adapter API.
TestRunner({

  // Load the adapter module.
  adapter: Adapter,

  // Adapter config to use for tests.
  config: {
    url: process.env.REDIS_URL || null
  },

  interfaces: ['semantic'] || packageMD.waterlineAdapter.interfaces,
  features: packageMD.waterlineAdapter.features
})
