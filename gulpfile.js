var gulp = require('gulp');
var babel = require('gulp-babel');
var watch = require('gulp-watch');

gulp.task('client-compile-watcher', function() {
    watch('./src/*', compileClientJavascripts)
});

gulp.task('client-compile', compileClientJavascripts);

function compileClientJavascripts() {
  gulp.src(['./src/*'], { base: './src' })
    .pipe(babel({ presets: ['es2015'] }))
    .pipe(gulp.dest('dist'))
    .pipe(gulp.dest('tests/public'))
}
