'use strict'

import ghUrl from 'github-url-from-git'
import pkg from '../package.json'

export default {
  repo: ghUrl(pkg.repository.url)
}
