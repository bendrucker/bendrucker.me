'use strict'

var BaseElement = require('base-element')

module.exports = Footer

function Footer (el) {
  BaseElement.call(this, el)
}
Footer.prototype = Object.create(BaseElement.prototype)
Footer.prototype.render = function (data) {
  var profile = data.profile
  var site = data.site
  var year = new Date().getFullYear()
  return this.afterRender(this.html('footer.page-footer', [
    this.html('p.copyright', ['©', year, profile.name].join(' ')),
    this.html('a.source', {href: site.repo}, [
      'Source',
      this.html('i.icon-github')
    ])
  ]))
}
