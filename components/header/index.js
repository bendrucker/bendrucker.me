'use strict'

import BaseElement from 'base-element'
import Headshot from './headshot'
import Twitter from './twitter'

export default class Header extends BaseElement {
  render (profile) {
    return this.afterRender(this.html('hedaer.page-header',[
      this.html('.content-wrap', [
        new Headshot().render(profile.headshot),
        this.html('.about-me', [
          this.html('h1', [
            profile.name,
            new Twitter().render(profile.twitter)
          ]),
          this.html('h2', profile.tagline)
        ])
      ])
    ]))
  }
}
