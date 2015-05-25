'use strict'

import BaseElement from 'base-element'
import ListItem from './list-item'

export default class PostList extends BaseElement {
  render (posts) {
    return this.afterRender(this.html('div.posts', posts.map(post => new ListItem().render(post))))
  }
}
