'use strict'

var BaseElement = require('base-element')

module.exports = Headshot

function Headshot (el) {
  BaseElement.call(this, el)
}
Headshot.prototype = Object.create(BaseElement.prototype)
Headshot.prototype.render = function (src) {
  return this.afterRender(this.html('a', {href: '/'}, [
    this.html('img.headshot', {src: src})
  ]))
}
