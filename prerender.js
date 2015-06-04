'use strict'

var Promise = require('bluebird')
var writeFileAsync = Promise.promisify(require('output-file'))
var loaders = require('./loaders')
var prettyHtml = require('js-beautify').html
var ap = require('ap')
var handlebars = require('handlebars')
var fs = require('fs')
var template = handlebars.compile(fs.readFileSync(__dirname + '/index.hbs').toString())

var formatHtml = ap.partialRight(prettyHtml, {
  indent_size: 2,
  end_with_newline: true
})

exports.render = function () {
  return Promise.props(loaders)
    .then(function (data) {
      return renderHome(data)
    })
}

var Home = require('./components/home')
function renderHome (data) {
  var html = new Home().toString(data)
  return writeFileAsync(__dirname + '/dist/index.html', formatHtml(template({
    content: html,
    title: data.profile.name
  })))
}
