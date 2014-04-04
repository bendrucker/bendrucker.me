'use strict';

var gulp    = require('gulp');
var plugins = require('gulp-load-plugins')();

var build = './build';

gulp.task('clean', function () {
  return gulp.src(build, {read: false})
    .pipe(plugins.clean());
});

gulp.task('styles:development', function () {
  return gulp.src('./styles/*.styl')
    .pipe(plugins.stylus({
      use: ['nib']
    }))
    .pipe(gulp.dest(build + '/styles'));
});

gulp.task('styles:production', function () {
  return gulp.src('./styles/main.styl')
    .pipe(plugins.stylus({
      use: ['nib'],
      set: ['compress']
    }))
    .pipe(gulp.dest(build + '/styles'));
});