'use strict'

import BaseElement from 'base-element'

export default class BaseElement extends BaseElement {
  render (src) {
    return this.afterRender(this.html('a', {href: '/'}, [
      this.html('img.headshot', {src})
    ]))
  }
}
