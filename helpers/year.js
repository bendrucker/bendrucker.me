'use strict';

exports.register = function (Handlebars) {
  Handlebars.registerHelper('year', function () {
    return new Date().getFullYear();
  });
};