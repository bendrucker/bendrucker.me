'use strict'

var test = require('tape')
var createHeadshot = require('./headshot')

test('headshot', function (t) {
  var headshot = createHeadshot()
  var vtree = headshot.render('theSrc')
  t.equal(vtree.tagName, 'A')
  t.equal(vtree.children.length, 1)
  var img = vtree.children[0]
  t.equal(img.properties.src, 'theSrc')
  t.end()
})
