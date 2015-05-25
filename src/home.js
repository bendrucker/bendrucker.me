'use strict'

import BaseElement from 'base-element'
import Header from './'
import PostList from './post/list'

export default class Home extends BaseElement {
  render (home) {
    return this.afterRender(this.html('div', [
      new Header().render(home.profile),
      new PostList().render(home.posts)
    ]))
  }
}
