'use strict';

module.exports = function (grunt) {
  grunt.loadNpmTasks('assemble');
  grunt.initConfig({
    assemble: {
      options: {
        plugins: [
          'assemble-contrib-permalinks',
          'handlebars-helper-partial'
        ],
        partials: './partials/*.hbs',
        data: './config/*.{yml,json}',
        helpers: './helpers/*.js',
        layoutdir: './layouts',
        layoutext: '.hbs',
        layout: 'default'
      },
      posts: {
        options: {
          layout: 'post',
          engine: 'handlebars',
          permalinks: {
            structure: ':basename/index.html',
          },
        },
        files: [{
          expand: true,
          cwd: './posts',
          src: ['**/*.md'],
          dest: './build/posts',
          ext: '.html'
        }]
      }
    }
  });
};