'use strict'

var BaseElement = require('base-element')
var Headshot = require('./headshot')
var Twitter = require('base-twitter-link')

module.exports = Header

function Header (el) {
  BaseElement.call(this, el)
}
Header.prototype = Object.create(BaseElement.prototype)
Header.prototype.render = function (profile) {
  return this.afterRender(this.html('header.page-header',[
    this.html('.content-wrap', [
      new Headshot().render(profile.headshot),
      this.html('.about-me', [
        this.html('h1', [
          profile.name,
          new Twitter().render(profile.twitter)
        ]),
        this.html('h2', profile.tagline)
      ])
    ])
  ]))
}
