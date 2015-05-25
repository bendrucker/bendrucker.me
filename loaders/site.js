'use strict'

import ghUrl from 'github-url-from-git'
import pkg from '../package.json'

export default const site = {
  repo: ghUrl(pkg.repository.url)
}
