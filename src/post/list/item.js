'use strict'

import BaseElement from 'base-element'
import * as date from '../date'

export default class PostListItem extends BaseElement {
  render (post) {
    return this.afterRender(this.html('a', {href: post.href}, [
      this.html('.post-title', [
        this.html('h2.post-headline', post.title),
        this.html('p', date.format(post.date))
      ]),
      this.html('h3.post-subtitle', post.subtitle),
      this.html('ul.post-tags', post.tags.map((tag) => {
        return this.html('li.post-category', tag)
      }))
    ]))
  }
}
