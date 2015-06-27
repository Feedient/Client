var ssg = require('ssg');
var fs = require('fs');

module.exports = function(grunt) {
	grunt.task.registerTask('ssg', 'Compile views to static HTML using Static Site Generator (SSG)', function(env) {
		var options = grunt.config.get('ssg.' + env);

		if (!options.config) {
			return grunt.fail.fatal('No SSG config file provided (you must set \'config\' property in the SSG options)');
		}

		// Make sure there is a ssg file for the environment (Static Site Generator manifest)
		if (!fs.existsSync(options.config)) {
			return grunt.fail.fatal(options.config + ' does not exist in the specified path');
		}

		if (!options.path) {
			options.path = '.';
		}

		// Load the manifest
		var ssgConfig = JSON.parse(fs.readFileSync(options.config, 'utf8'));

		// Run SSG
		ssg(options.path, ssgConfig, grunt.log.oklns);
	});
};