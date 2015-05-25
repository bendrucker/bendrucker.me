'use strict'

import BaseElement from 'base-element'

export default class TwitterLink extends BaseElement {
  render (username) {
    const href = `https://twitter.com/${username}`
    const display = `@${username}`
    return this.afterRender(this.html('a', {href, rel: 'me'}, display))
  }
}
