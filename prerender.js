'use strict'

import Promise from 'bluebird'
import outputFile from 'output-file'
const writeFileAsync = Promise.promisify(outputFile)
import {posts, profile, site} from './loaders'
import {html as prettyHtml} from 'js-beautify'
import {partial, partialRight} from 'ap'

export function render () {
  return Promise.join(
    renderHome()
  )
  .return(null)
}

import Home from './components/home'
function renderHome () {
  return Promise.props({posts, profile, site})
    .then((data) => {
      return new Home().toString(data)
    })
    .then(partialRight(prettyHtml, {
      indent_size: 2,
      end_with_newline: true
    }))
    .then(partial(writeFileAsync, './dist/index.html'))
}
