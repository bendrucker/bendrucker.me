'use strict'

var gh = require('github-url-from-git')
var pkg = require('../package.json')

exports.repo = gh(pkg.repository.url)
