'use strict'

var BaseElement = require('base-element')
var sort = require('sort-on')
var ListItem = require('./item')

module.exports = PostList

function PostList (el) {
  BaseElement.call(this, el)
}
PostList.prototype = Object.create(BaseElement.prototype)
PostList.prototype.render = function (posts) {
  posts = sort(posts, 'date').reverse()
  return this.afterRender(this.html('div.posts', posts.map(function (post) {
    return new ListItem().render(post)
  })))
}
