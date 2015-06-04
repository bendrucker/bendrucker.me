'use strict'

var Promise = require('bluebird')
var glob = Promise.promisify(require('glob'))
var mothership = Promise.promisify(require('mothership'))
var path = require('path')
var fs = Promise.promisifyAll(require('fs'))
var removeExt = require('remove-ext')
var matter = require('gray-matter')
var remarkable = require('remarkable')
var mapObject = require('map-obj')
var extend = require('xtend')

Promise.promisifyAll(fs)

module.exports = mothership(__dirname, Boolean)
  .get('path')
  .then(path.dirname)
  .then(function (cwd) {
    return Promise.promisify(glob)('posts/*.md', {cwd})
      .map(function (path) {
        return fs.readFileAsync(path).call('toString')
          .then(function (raw) {
            var parsed = matter(raw)
            return extend({
              markdown: parsed.content.trim(),
              href: '/' + removeExt(path)
            }, parse(parsed.data))
          })
      })
  })

var parsers = extend(Object.create(null), {
  tags: function (string) {
    return (string || '').split(', ')
  }
})

function parse (metadata) {
  return mapObject(metadata, function (key, value) {
    return [key, (parsers[key] || identity)(value)]
  })
}

function identity (value) {
  return value
}
