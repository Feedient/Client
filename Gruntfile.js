module.exports = function(grunt) {
	// Automatically load plugins (see node_modules)
	require('jit-grunt')(grunt);

	// Task configuration
	grunt.initConfig({
		// Create the build folders
		mkdir: {
			main: {
				options: {
					mode: 0775,
					create: [
						'build/frontpage',
						'build/client',
						'build/admin',
						'build/shared',
						'build/doc'
					]
				}
			}
		},

		// Remove files not needed in build (less, ejs, ...)
		clean: {
			everything: [ 'build/*' ],
			build: [ 'build/**/*.less', 'build/**/*.ejs' ],
		},

		// Sync is used for watch in development, it will keep untouched files (faster copying)
		sync: {
			dev: {
				files: [{
					cwd: 'src/',
					src: ['**/*'],
					dest: 'build/'
				}],
				updateOnly: true
			},
			stag: {
				files: [{
					cwd: 'src/',
					src: ['**/*'],
					dest: 'build/'
				}]
			},
			prod: {
				files: [{
					cwd: 'src/',
					src: ['**/*'],
					dest: 'build/'
				}]
			}
		},

		// Compile LESS to CSS
		less: {
			main: {
				options: {
					cleancss: true
				},

				files: {
					'build/client/css/main.css': 'src/client/css/main.less',
					'build/frontpage/css/main.css': 'src/frontpage/css/main.less'
				}
			}
		},

		// Compile EJS to HTML using SSG
		ssg: {
			dev: {
				config: 'config/ssg_dev.json'
			},

			stag: {
				config: 'config/ssg_stag.json'
			},

			prod: {
				config: 'config/ssg_prod.json'
			}
		},

		// Minify HTML
		htmlmin: {
			main: {
				options: {
					removeComments: true,
					collapseWhitespace: true
				},

				files: [
					{
						expand: true,
						cwd: 'build/frontpage/',
						dest: 'build/frontpage/',
						src: ['*.html']
					},

					{
						expand: true,
						cwd: 'build/client/',
						dest: 'build/client/',
						src: ['*.html']
					}
				]
			}
		},

		// Minify JS
		uglify: {
			main: {
				options: {
					mangle: false,
					compress: true,
					banner: '/* Feedient - <%= grunt.template.today("yyyy-mm-dd") %> */\n'
				},

				files: [
					{
						expand: true,
						cwd: 'build/frontpage/js/',
						dest: 'build/frontpage/js/',
						src: ['*.js']
					},

					{
						expand: true,
						cwd: 'build/client/',
						dest: 'build/client/',
						src: ['**/*.js']
					}
				]
			}
		},

		// Combine files as one
		concat: {
			helpers: {
				src: [ 'src/client/app/helpers/*.js' ],
				dest: 'build/client/app/helpers/all.js'
			},

			providers: {
				src: [ 'src/client/app/providers/*.js' ],
				dest: 'build/client/app/providers/all.js'
			},

			panels: {
				src: [ 'src/client/app/panels/*.js' ],
				dest: 'build/client/app/panels/all.js'
			},

			controllers: {
				src: [ 'src/client/app/controllers/*.js' ],
				dest: 'build/client/app/controllers/all.js'
			}
		},

		// Cache busting
		hash: {
			options: {
				mapping: 'build/client/hashes.json',
				srcBasePath: 'build/client/',
				destBasePath: 'build/client/',
				hashLength: 20,
				hashFunction: function(source, encoding) {
					return require('crypto').createHash('sha1').update(source, encoding).digest('hex');
				}
			},

			controllers: {
				src: 'build/client/app/controllers/all.js',
				dest: 'build/client/app/controllers/'
			},

			providers: {
				src: 'build/client/app/providers/all.js',
				dest: 'build/client/app/providers/'
			},

			helpers: {
				src: 'build/client/app/helpers/all.js',
				dest: 'build/client/app/helpers/'
			},

			libraries: {
				src: 'build/client/app/libraries/*.js',
				dest: 'build/client/app/libraries/'
			}
		},

		watch: {
			/**
			 * For JS:
			 * 1. Sync files
			 */
			javascript: {
				files: [
					'src/**/*',
					'!src/**/*.less',
					'!src/**/*.ejs'
				],
				options: {
					livereload: true
				},
				tasks: [
					'sync:dev',
					'clean:build'
				]
			},
			/**
			 * For less
			 * 1. Sync files
			 * 2. Build css files
			 * 3. Remove less files
			 */
			less: {
				files: [
					'src/**/*.less'
				],
				options: {
					livereload: true
				},
				tasks: [
					'sync:dev',
					'less',
					'clean:build'
				]
			},
			/**
			 * For ejs files:
			 * 1. Sync
			 * 2. Build SSG
			 * 3. Clean ejs files
			 */
			ejs: {
				files: [
					'src/**/*.ejs'
				],
				options: {
					livereload: true,
					spawn: false
				},
				tasks: [
					'sync:dev',
					'ssg:dev',
					'clean:build'
				]
			}
		}
	});

	// Development
	grunt.registerTask('default', 'Development Mode; Watch files and reload browser on changes', [
		'clean:everything',
		'mkdir',
		'sync:dev',
		'less',
		'ssg:dev',
		'clean:build',
		'simple-watch'
	]);

	// Staging
	grunt.registerTask('stag', [
		'clean:everything',
		'mkdir',
		'sync:stag',
		'less',
		'concat:helpers',
		'concat:controllers',
		'concat:providers',
		'hash:helpers',
		'hash:controllers',
		'hash:providers',
		'hash:libraries',
		'ssg:stag',
		'htmlmin',
		'uglify',
		'clean:build'
	]);

	// Production
	grunt.registerTask('prod', [
		'clean:everything',
		'mkdir',
		'sync:prod',
		'less',
		'concat:helpers',
		'concat:controllers',
		'concat:providers',
		'hash:helpers',
		'hash:controllers',
		'hash:providers',
		'hash:libraries',
		'ssg:prod',
		'htmlmin',
		'uglify',
		'clean:build',
	]);
};