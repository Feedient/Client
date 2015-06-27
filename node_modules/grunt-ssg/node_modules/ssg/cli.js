#! /usr/bin/env node

var fs = require('fs');
var ssg = require('./index');

// Make sure a path is specified
if (process.argv.length < 3) {
	console.log('Please provide a valid path.');
	return;
}

var path = process.argv[2];
var env = process.argv[3] || 'dev';

// Make sure there is a ssg file for the environment (Static Site Generator manifest)
if (!fs.existsSync(path + '/ssg_' + env + '.json')) {
	console.log('ssg_' + env + '.json does not exist in the specified path');
	return;
}

// Load the manifest
var ssgConfig = JSON.parse(fs.readFileSync(path + '/ssg_' + env + '.json', 'utf8'));

// Run SSG
ssg(path, ssgConfig);