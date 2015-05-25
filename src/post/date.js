'use strict'

import {abbr as months} from 'months'

export function format (date) {
  const month = months[date.getMonth()]
  const dateNum = date.getDate()
  const year = date.getYear() - 100
  return `${month} ${dateNum}, ${year}`
}
