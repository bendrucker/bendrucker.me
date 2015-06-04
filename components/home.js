'use strict'

var BaseElement = require ('base-element')
var Header = require('./header')
var Footer = require('./footer')
var PostList = require('./post/list')

module.exports = Home

function Home (el) {
  BaseElement.call(this, el)
}
Home.prototype = Object.create(BaseElement.prototype)
Home.prototype.render = function () {
  return this.afterRender(this.html('div', [
    new Header().render(profile),
    new PostList().render(posts),
    new Footer().render({profile: profile, site: site})
  ]))
}
