var gulp = require('gulp');
var shell = require('gulp-shell');
var mocha = require('gulp-mocha');
var watch = require('gulp-watch');
var jshint = require('gulp-jshint');
var cleanDest = require('gulp-clean-dest');

var srcRoot = './src/';
var cfgRoot = './cfg/';
var tstRoot = './test/';
var buildDir = './build/';

gulp.task('prepare-upload', function() {
  gulp.src([srcRoot + '*.js', cfgRoot + '*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'))
    .pipe(gulp.dest(buildDir));

});

gulp.task('test', function() {
  return gulp.src(tstRoot + '*.js', {
      read: false
    })
    // gulp-mocha needs filepaths so you can't have any plugins before it
    .pipe(mocha({
      reporter: 'nyan'
    }));
});

gulp.task('upload',
  shell.task(['gapps upload'], {
    cwd: '.'
  }));

gulp.task('cleanup', function() {
  return cleanDest(buildDir);
});

gulp.task('watch', function() {
  return gulp.src([srcRoot + '*.js', cfgRoot + '*.js'])
    .pipe(watch([srcRoot + '*.js', cfgRoot + '*.js']))
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(cleanDest(buildDir))
    .pipe(gulp.dest(buildDir))
    .pipe(gulp.task('upload'));
});

gulp.task('default', ['cleanup', 'prepare-upload', 'test', 'upload']);
