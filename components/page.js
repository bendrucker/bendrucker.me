'use strict'

var BaseElement = require('base-element')
var pick = require('object-pick')
var Header = require('./header')
var Footer = require('./footer')

module.exports = Page

function Page (el) {
  BaseElement.call(this, el)
}
Page.prototype = Object.create(BaseElement.prototype)
Page.prototype.render = function (data) {
  return this.afterRender(this.html('div', [
    new Header().render(data.profile),
    data.content,
    new Footer().render(pick(data, 'profile', 'site'))
  ]))
}
