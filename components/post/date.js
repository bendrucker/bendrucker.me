'use strict'

var months = require('months').abbr
var printf = require('pff')

exports.format = function (date) {
  var month = months[date.getMonth()]
  var dateNum = date.getDate()
  var year = date.getYear() - 100
  return printf('%s %s, %s', month, dateNum, year)
}
