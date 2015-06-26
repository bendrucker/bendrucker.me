'use strict'

var createElement = require('base-element')

module.exports = function (element) {
  var element = createElement(element)
  return {
    render: function renderHeadshot (src) {
      return element.render(function () {
        return element.html('a', {href: '/'}, [
          element.html('img.headshot', {src: src})
        ])
      })
    }
  }
}
