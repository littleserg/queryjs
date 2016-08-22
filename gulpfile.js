var GithubApi = require('github');
var gulp = require('gulp');
var path = require('canonical-path');
var pkg = require('./package.json');
var request = require('request');
var q = require('q');
var through = require('through');

var argv = require('minimist')(process.argv.slice(2));

var _ = require('lodash');
var buildConfig = require('./config/build.config.js');
var changelog = require('conventional-changelog');

var cp = require('child_process');
var fs = require('fs');

var concat = require('gulp-concat');
var footer = require('gulp-footer');
var gulpif = require('gulp-if');
var header = require('gulp-header');
var eslint = require('gulp-eslint');
var rename = require('gulp-rename');
var stripDebug = require('gulp-strip-debug');
var template = require('gulp-template');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');

var banner = buildConfig.banner;

var IS_RELEASE_BUILD = !!argv.release;
if (IS_RELEASE_BUILD) {
  gutil.log(
    gutil.colors.red('--release:'),
    'Building release version (minified, debugs stripped)...'
  );
}

if (argv.dist) {
  buildConfig.dist = argv.dist;
}

gulp.task('default', ['build']);
gulp.task('build', ['bundle', 'specs']);

gulp.task('bundle', [
  'scripts', 'angular-int'
], function() {
  gulp.src(buildConfig.queryjsBundleFiles.map(function(src) {
    console.log(src.replace(/.js$/, '.min.js'))
      return src.replace(/.js$/, '.min.js');
    }), {
      base: buildConfig.dist,
      cwd: buildConfig.dist
    })
      .pipe(header(buildConfig.bundleBanner))
      .pipe(concat('queryjs.bundle.min.js'))
      .pipe(gulp.dest(buildConfig.dist + '/js'));

  return gulp.src(buildConfig.queryjsBundleFiles, {
    base: buildConfig.dist,
    cwd: buildConfig.dist
  })
    .pipe(header(buildConfig.bundleBanner))
    .pipe(concat('queryjs.bundle.js'))
    .pipe(gulp.dest(buildConfig.dist + '/js'));
});

gulp.task('scripts', function() {
  return gulp.src(buildConfig.queryjsFiles)
    .pipe(gulpif(IS_RELEASE_BUILD, stripDebug()))
    //.pipe(template({ pkg: pkg }))
    .pipe(concat('queryjs.js'))
    .pipe(header(buildConfig.closureStart))
    .pipe(footer(buildConfig.closureEnd))
    .pipe(header(banner))
    .pipe(gulp.dest(buildConfig.dist + '/js'))
    .pipe(gulpif(IS_RELEASE_BUILD, uglify()))
    .pipe(rename({ extname: '.min.js' }))
    .pipe(header(banner))
    .pipe(gulp.dest(buildConfig.dist + '/js'));
});

var jasmine = require('gulp-jasmine');
gulp.task('specs', function () {
  return gulp.src('spec/*.js')
      .pipe(jasmine());
});


gulp.task('angular-int', function() {
  return gulp.src(['src/queryjs.angular.js'])
      .pipe(gulp.dest(buildConfig.dist + '/js'));
});

gulp.task('version', function() {
  var d = new Date();
  var date = d.toISOString().substring(0,10);
  var time = pad(d.getUTCHours()) +
      ':' + pad(d.getUTCMinutes()) +
      ':' + pad(d.getUTCSeconds());
  return gulp.src('config/version.template.json')
    .pipe(template({
      pkg: pkg,
      date: date,
      time: time
    }))
    .pipe(rename('version.json'))
    .pipe(gulp.dest(buildConfig.dist));
});

gulp.task('release-github', function(done) {
  var github = new GithubApi({
    version: '3.0.0'
  });
  github.authenticate({
    type: 'oauth',
    token: process.env.GH_TOKEN
  });
  makeChangelog({
    standalone: true
  })
  .then(function(log) {
    var version = 'v' + pkg.version;
    github.releases.createRelease({
      owner: 'litleserg',
      repo: 'querys',
      tag_name: version,
      name: version + ' "' + pkg.codename + '"',
      body: log
    }, done);
  })
  .fail(done);
});

function pad(n) {
  if (n<10) { return '0' + n; }
  return n;
}
function qRequest(opts) {
  var deferred = q.defer();
  request(opts, function(err, res, body) {
    if (err) deferred.reject(err);
    else deferred.resolve(res);
  });
  return deferred.promise;
}
