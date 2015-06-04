'use strict'

var BaseElement = require('base-element')
var formatDate = require('../date').format

function PostListItem (el) {
  BaseElement.call(this, el)
}
PostListItem.prototype = Object.create(BaseElement.prototype)
PostListItem.prototype.render = function () {
  return this.afterRender(this.html('a', {href: post.href}, [
    this.html('.post-title', [
      this.html('h2.post-headline', post.title),
      this.html('p', date.format(post.date))
    ]),
    this.html('h3.post-subtitle', post.subtitle),
    this.html('ul.post-tags', post.tags.map(function (tag) {
      return this.html('li.post-category', tag)
    }, this))
  ]))
}
