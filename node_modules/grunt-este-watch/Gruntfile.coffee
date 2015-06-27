module.exports = (grunt) ->

  grunt.initConfig
    jshint:
      options:
        evil: true
        laxcomma: true
        loopfunc: true
        eqnull: true
      all: [
        'tasks/**/*.js'
      ]

    release:
      options:
        bump: true
        add: true
        commit: true
        tag: true
        push: true
        pushTags: true
        npm: true

  grunt.loadNpmTasks 'grunt-release'
  grunt.loadNpmTasks 'grunt-contrib-jshint'

  grunt.registerTask 'test', 'jshint'