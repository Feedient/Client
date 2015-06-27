/**
  @fileoverview File watcher for Grunt.js
  Copyright (c) 2013 Daniel Steigerwald
*/
module.exports = function(grunt) {

  var fs = require('fs');
  var path = require('path');
  var tinylr = require('tiny-lr-fork');
  var semver = require('semver');

  var RESTART_WATCHERS_DEBOUNCE = 10;
  var WAIT_FOR_UNLOCK_INTERVAL = 10;
  var WAIT_FOR_UNLOCK_TRY_LIMIT = 50;

  var changedFilesForLiveReload = [];
  var done;
  var esteWatchTaskIsRunning = false;
  var filesChangedWithinWatchTask = [];
  var firstRun = true;
  var lrServer;
  var options;
  var watchers = [];
  var watchTaskStart;
  var unlockTimer = null;

  if(semver.lt(process.versions.node, '0.9.2')) {
    grunt.fail.warn("Use node 0.9.2+, due to buggy fs.watch");
  }

  grunt.registerTask('esteWatch', 'Este files watcher.', function() {

    options = this.options({
      dirs: [
        'bower_components/closure-library/**/',
        'bower_components/este-library/**/',
        '!bower_components/este-library/node_modules/**/',
        'client/**/{js,css}/**/'
      ],
      ignoredFiles: [],
      livereload: {
        enabled: true,
        port: 35729,
        extensions: ['js', 'css']
      },
      // friendly beep on error
      beep: false
    });
    done = this.async();
    esteWatchTaskIsRunning = false;
    watchTaskStart = Date.now();

    grunt.log.ok('Waiting...');

    if (firstRun) {
      firstRun = false;
      restartWatchers();
      if (options.livereload.enabled)
        runLiveReloadServer();
      keepThisTaskRunForeverViaHideousHack();
    }

    dispatchWaitingChanges();

  });

  grunt.registerTask('esteWatchLiveReload', function() {
    if (!options.livereload.enabled)
      return;
    if (changedFilesForLiveReload.length) {
      changedFilesForLiveReload = grunt.util._.uniq(changedFilesForLiveReload);
      notifyLiveReloadServer(changedFilesForLiveReload);
      changedFilesForLiveReload = [];
    }
  });

  // TODO: handle hypothetic situation, when task create dir
  var restartWatchers = function() {
    var start = Date.now();
    closeWatchers();
    var allDirs = grunt.file.expand(options.dirs);
    grunt.verbose.writeln('Watched dirs: ' + allDirs);
    watchDirs(allDirs);
    var duration = Date.now() - start;
    grunt.log.writeln((
      allDirs.length + ' dirs watched within ' + duration + ' ms.').cyan);
  };

  var notifyLiveReloadServer = function(filepaths) {
    grunt.verbose.ok('notifyLiveReloadServer: ' + filepaths);
    filepaths = filepaths.filter(function(filepath) {
      var ext = path.extname(filepath).slice(1);
      return options.livereload.extensions.indexOf(ext) != -1;
    });
    if (!filepaths.length) {
      grunt.log.writeln('Nothing to live reload.');
      return;
    }
    lrServer.changed({
      body: {
        files: filepaths
      }
    });
  };

  // It's safer to wait in case of bulk changes.
  var restartDirsWatchersDebounced = grunt.util._.debounce(
    restartWatchers, RESTART_WATCHERS_DEBOUNCE);

  var runLiveReloadServer = function() {
    // If key and cert file paths are provided, read them.
    ['key', 'cert'].forEach(function(attr) {
      if (options.livereload[attr] && !Buffer.isBuffer(options.livereload[attr])) {
        options.livereload[attr] = grunt.file.read(options.livereload[attr]);
      }
    });
    lrServer = tinylr(options.livereload);
    lrServer.server.removeAllListeners('error');
    lrServer.server.on('error', function(err) {
      if (err.code === 'EADDRINUSE') {
        grunt.fatal('Port ' + options.livereload.port + ' is already in use by another process.');
        grunt.fatal('Open OS process manager and kill all node\'s processes.');
      } else {
        grunt.fatal(err);
      }
      process.exit(1);
    });
    lrServer.listen(options.livereload.port, function(err) {
      if (err) {
        grunt.fatal(err);
        return;
      }
      grunt.log.writeln(
        'LiveReload server started on port: ' + options.livereload.port);
    });
  };

  // TODO: fork&fix Grunt
  var keepThisTaskRunForeverViaHideousHack = function() {
    var createLog = function(isWarning) {
      return function(e) {
        var message = typeof e == 'string' ? e : e.message;
        var line = options.beep ? '\x07' : '';
        if (isWarning) {
          line += ('Warning: ' + message).yellow;
          if (grunt.option('force')) return;
        }
        else {
          line += ('Fatal error: ' + message).red;
        }
        grunt.log.writeln(line);
        rerun();
      };
    };

    grunt.warn = grunt.fail.warn = createLog(true);
    grunt.fatal = grunt.fail.fatal = createLog(false);
  };

  var rerun = function() {
    grunt.task.clearQueue();
    grunt.task.run('esteWatch');
  };

  var dispatchWaitingChanges = function() {
    var waitingFiles = grunt.util._.uniq(filesChangedWithinWatchTask);
    grunt.verbose.ok('Files changed within watch task:');
    grunt.verbose.ok(waitingFiles);
    var ignoredFiles = filesChangedWithinWatchTask.dispatcher;
    filesChangedWithinWatchTask = [];
    waitingFiles.forEach(function(filepath) {
      if (filepath == ignoredFiles)
        return;
      onFileChange(filepath);
    });
  };

  var closeWatchers = function() {
    watchers.forEach(function(watcher) {
      watcher.close();
    });
    watchers = [];
  };

  var watchDirs = function(dirs) {
    dirs.forEach(function(dir) {
      var watcher = fs.watch(dir, function(event, filename) {
        onDirChange(event, filename, dir);
      });
      watchers.push(watcher);
    });
  };

  var onDirChange = function(event, filename, dir) {
    var filepath = path.join(dir || '', filename || '');
    // Normalize \\ paths to / paths. Yet another Windows fix.
    filepath = filepath.replace(/\\/g, '/');
    // fs.statSync fails on deleted symlink dir with "Abort trap: 6" exception
    // https://github.com/bevry/watchr/issues/42
    // https://github.com/joyent/node/issues/4261
    var fileExists = fs.existsSync(filepath);
    if (!fileExists)
      return;
    if (fs.statSync(filepath).isDirectory()) {
      grunt.log.ok('Dir changed: ' + filepath);
      restartDirsWatchersDebounced();
      return;
    }
    onFileChange(filepath);
  };

  var onFileChange = function(filepath) {
    var minimatchOptions = {
      dot: true,
      matchBase: true, 
      nocomment: true, 
      nonegate: true
    };
    if (grunt.file.isMatch(minimatchOptions, options.ignoredFiles, filepath))
      return;

    if (options.livereload.enabled)
      changedFilesForLiveReload.push(filepath);

    // postpone changes occured during tasks execution
    if (esteWatchTaskIsRunning) {
      grunt.verbose.writeln('filesChangedWithinWatchTask.push ' + filepath);
      filesChangedWithinWatchTask.push(filepath);
      return;
    }

    if (grunt.task.current.name == 'esteWatch') {
      esteWatchTaskIsRunning = true;
      // We have to track file which dispatched watch task, because on Windows
      // file change dispatches two or more events, which is actually ok, but
      // we have to ignore these changes later.
      // https://github.com/joyent/node/issues/2126
      filesChangedWithinWatchTask.dispatcher = filepath;
    }

    // detect user's 'unit of work'
    var userAction = (Date.now() - watchTaskStart) > 500;
    if (userAction) {
      grunt.log.ok('User action.'.yellow);
    }

    // run tasks for changed file
    grunt.log.ok('File changed: ' + filepath);
    var tasks = getFilepathTasks(filepath);
    if (options.livereload.enabled)
      tasks.push('esteWatchLiveReload');
    tasks.push('esteWatch');

    var waitTryCount = 0;
    var waitForFileUnlock = function() {
      var isLocked = false;
      waitTryCount++;
      try {
        fs.readFileSync(filepath);
      } catch (e) {
        // File is locked
        isLocked = true;
      }
      if(!isLocked || waitTryCount > WAIT_FOR_UNLOCK_TRY_LIMIT) {
        done();
        grunt.task.run(tasks);
      } else {
        grunt.verbose.writeln('Waiting for file to unlock (' + waitTryCount + '): ' + filepath);
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(waitForFileUnlock, WAIT_FOR_UNLOCK_INTERVAL);
      }
    };
    waitForFileUnlock();
  };

  var getFilepathTasks = function(filepath) {
    var ext = path.extname(filepath).slice(1);
    var config = grunt.config.get(['esteWatch', ext]);
    if (!config)
      config = grunt.config.get(['esteWatch', '*']);
    if (!config)
      return [];
    var tasks = config(filepath) || [];
    if (!Array.isArray(tasks))
      tasks = [tasks];
    return tasks;
  };

};