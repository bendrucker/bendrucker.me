'use strict'

var BaseElement = require ('base-element')
var extend = require('xtend')
var Page = require('./page')
var PostList = require('./post/list')

module.exports = Home

function Home (el) {
  BaseElement.call(this, el)
}
Home.prototype = Object.create(BaseElement.prototype)
Home.prototype.render = function (data) {
  return this.afterRender(new Page().render(extend(data, {
    content: new PostList().render(data.posts)
  })))
}
