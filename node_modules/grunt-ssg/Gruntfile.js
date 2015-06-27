module.exports = function(grunt) {

	// Task configuration
	grunt.initConfig({
		ssg: {
			dev: {
				config: 'ssg_dev.json'
			}
		}
	});

	grunt.loadTasks('tasks');
	
	grunt.registerTask('default', ['ssg:dev']);
};