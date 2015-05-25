'use strict'

import BaseElement from 'base-element'

export default class Footer extends BaseElement {
  render ({profile, site}) {
    const year = new Date().getFullYear()
    return this.afterRender(this.html('footer.page-footer', [
      this.html('p.copyright', `© ${year} ${profile.name}`),
      this.html('a.source', {href: site.repo}, [
        'Source',
        this.html('i.icon-github')
      ])
    ]))
  }
}
