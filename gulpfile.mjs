import { src, dest, series, parallel, watch, task } from 'gulp';

import * as dartSass from 'sass';
import gulpSass from 'gulp-sass';
import gulpMode from 'gulp-mode';
import coffee from 'gulp-coffee';
import sourcemaps from 'gulp-sourcemaps';
import plumber from 'gulp-plumber';
import notify from 'gulp-notify';
import noop from 'gulp-noop';
import concat from 'gulp-concat';
import rename from 'gulp-rename';
import autoprefixer from 'gulp-autoprefixer';
import uglify from 'gulp-uglify';
import browserSync from 'browser-sync';
import newer from 'gulp-newer';
import imagemin from 'gulp-imagemin';
import fonter from 'gulp-fonter';
import ttfWoff from 'gulp-ttf2woff2';
import { deleteAsync } from 'del';

const mode = gulpMode({
	modes: ['production', 'development'],
	defaultMode: 'development',
	verbose: false,
});

const sass = gulpSass(dartSass);
const bs = browserSync.create();

const plumberNotify = (title) => {
	return {
		errorHandler: notify.onError({
			title: title,
			message: 'Error: <%= error.message %>',
			sound: false,
		}),
	};
};

const isProduction = mode.production();

function styles() {
	return src('app/scss/*.scss')
		.pipe(plumber(plumberNotify('SCSS')))
		.pipe(isProduction ? noop() : sourcemaps.init())
		.pipe(
			autoprefixer({
				overrideBrowserslist: [
					'> 1%',
					'ie >= 8',
					'edge >= 15',
					'ie_mob >= 10',
					'ff >= 45',
					'chrome >= 45',
					'safari >= 7',
					'opera >= 23',
					'ios >= 7',
					'android >= 4',
					'bb >= 10',
				],
				grid: true,
			}),
		)
		.pipe(sass().on('error', sass.logError))
		.pipe(sass({ outputStyle: isProduction ? 'compressed' : 'expanded' }))
		.pipe(isProduction ? noop() : sourcemaps.write(''))
		.pipe(rename({ suffix: '.min' }))
		.pipe(dest('app/css'))
		.pipe(bs.stream());
}

function coffeeScripts() {
	return src('app/coffee/index.coffee')
		.pipe(plumber(plumberNotify('COFFEE')))
		.pipe(coffee({ bare: true }))
		.pipe(mode.production(uglify()))
		.pipe(concat('index.min.js'))
		.pipe(dest('app/scripts'))
		.pipe(bs.stream());
}

// function scripts() {
// 	return src('app/scripts/index.js')
// 		.pipe(plumber(plumberNotify('JS')))
// 		.pipe(concat('index.min.js'))
// 		.pipe(mode.production(uglify()))
// 		.pipe(dest('app/scripts'))
// 		.pipe(bs.stream());
// }

function images() {
	return src(['app/img/src/*.*', '!app/img/src/*.svg'], { encoding: false })
		.pipe(newer('app/img/dist'))
		.pipe(imagemin({ verbose: true }))
		.pipe(dest('app/img/dist'));
}

async function fonts() {
	return src('app/fonts/src/*.*', { encoding: false })
		.pipe(newer('app/fonts/dist'))
		.pipe(fonter({ formats: ['woff', 'ttf'] }))
		.pipe(dest('app/fonts/dist'))
		.pipe(src('app/fonts/*.ttf'))
		.pipe(ttfWoff())
		.pipe(dest('app/fonts/dist'));
}

function html() {
	return src('app/*.html').pipe(dest('app')).pipe(bs.stream());
}

async function cleanDist() {
	await deleteAsync('dist');
}

async function build() {
	return src(
		[
			'app/css/*.css',
			'app/fonts/dist/*.*',
			'!app/css/*.map',
			'!app/img/src/*.*',
			'app/img/dist/*.*',
			'app/scripts/index.min.js',
			'app/*.html',
		],
		{ base: 'app', allowEmpty: true, encoding: false },
	).pipe(dest('dist'));
}

function watchFiles() {
	if (!isProduction) {
		bs.init({
			server: {
				baseDir: 'app/',
			},
			open: true,
		});
	}
	watch(['app/scss/**/*.scss'], styles);
	watch(['app/coffee/**/*.coffee'], coffeeScripts);
	// watch(['app/scripts/**/*.js', '!app/scripts/index.min.js'], scripts);
	watch(['app/img/src/'], images);
	watch(['app/*.html']).on('change', bs.reload);
}

task('styles', styles);
// task('scripts', scripts);
task('coffee', coffeeScripts);
task('clean', cleanDist);
task('images', images);
task('fonts', fonts);
task('html', html);
task('watch', watchFiles);
task('production', build);

async function allTasks() {
	return isProduction
		? series('styles', 'coffee', 'production')()
		: parallel('html', 'styles', 'images', 'fonts', 'coffee', 'watch')();
}

// gulp build --production для production сборке
task('build', series(cleanDist, allTasks));

// gulp для develop сборке
task('default', allTasks);
