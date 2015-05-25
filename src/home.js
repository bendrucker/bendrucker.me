'use strict'

import BaseElement from 'base-element'
import Header from './header'
import Footer from './footer'
import PostList from './post/list'

export default class Home extends BaseElement {
  render ({profile, posts, site}) {
    return this.afterRender(this.html('div', [
      new Header().render(profile),
      new PostList().render(posts),
      new Footer().render({profile, site})
    ]))
  }
}
