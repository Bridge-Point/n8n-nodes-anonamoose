const { src, dest } = require('gulp');

function buildIcons() {
	return src('icons/**/*.svg').pipe(dest('dist/icons/'));
}

function buildNodeIcons() {
	return src('nodes/**/*.svg').pipe(dest('dist/nodes/'));
}

exports['build:icons'] = async function () {
	await Promise.all([
		new Promise((resolve, reject) => buildIcons().on('end', resolve).on('error', reject)),
		new Promise((resolve, reject) => buildNodeIcons().on('end', resolve).on('error', reject)),
	]);
};
