'use strict'

import Promise from 'bluebird'
import glob from 'glob'
import mothership from 'mothership'
import {resolve, dirname} from 'path'
import fs from 'fs'
import removeExt from 'remove-ext'
import matter from 'gray-matter'
import remarkable from 'remarkable'
import mapObject from 'map-obj'

Promise.promisifyAll(fs)

Promise.promisify(mothership)(__dirname, Boolean)
  .get('path')
  .then(dirname)
  .then((cwd) => {
    return Promise.promisify(glob)('posts/*.md', {cwd})
      .map((path) => {
        return fs.readFileAsync(path).call('toString')
          .then((raw) => {
            const parsed = matter(raw)
            return Object.assign({
              markdown: parsed.content.trim(),
              href: '/' + removeExt(path)
            }, parse(parsed.data))
          })
      })
  })

const parsers = Object.assign(Object.create(null), {
  tags: function (string) {
    return (string || '').split(', ')
  }
})

function parse (metadata) {
  return mapObject(metadata, (key, value) => {
    return [key, (parsers[key] || identity)(value)]
  })
}

function identity (value) {
  return value
}
