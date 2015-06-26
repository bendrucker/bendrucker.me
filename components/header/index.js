'use strict'

var createElement = require('base-element')
var createHeadshot = require('./headshot')
var createTwitter = require('base-twitter-link')

module.exports = function (element) {
  var element = createElement(element)
  return {
    render: function renderHeader (profile) {
      return element.render(function () {
        return element.html('header.page-header', [
          element.html('.content-wrap', [
            createHeadshot().render(profile.headshot),
            element.html('.about-me', [
              element.html('h1', [
                profile.name,
                createTwitter().render(profile.twitter)
              ]),
              element.html('h2', profile.tagline)
            ])
          ])
        ])
      })
    }
  }
}
