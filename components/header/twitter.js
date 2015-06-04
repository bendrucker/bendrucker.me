'use strict'

var BaseElement = require('base-element')

function TwitterLink (el) {
  BaseElement.call(this, el)
}
TwitterLink.prototype = Object.create(BaseElement.prototype)
Twitter.prototype.render = function (username) {
  var href = 'https://twitter.com/' + username
  var display = '@' + username
  var props = {
    href: href,
    rel: 'me'
  }
  return this.afterRender(this.html('a', props, display))
}
