$(function() {
	'use strict';
	
	window.app = {};

	var initialize = function() {
		var loaders = [];

		for (var i in app.config.autoLoad) {
			(function(key, value) {
				loaders.push(function(callback) {
					if ($.isArray(value)) {
						loadFiles(key, value, callback);
					} else {
						loadFiles(key, value.files, callback, !value.initialize);
					}
				});
			}(i, app.config.autoLoad[i]));
		}

		// Autoload all components
		async.series(loaders, function() {
			// All files have been autoloaded, preload data necessary for the "loaded" hooks
			app.core.hooks.trigger('loaded', function() {
				// All necessary data has been loaded, give libraries opportunity to preload own assets
				app.core.hooks.trigger('preloadAssets', function() {
					// All necessary assets have been preloaded
					app.core.hooks.trigger('ready');
				});
			});
		});
	};

	require(['app/config'], initialize);

	/**
	 * Load the provided files and initialize them
	 * @param String namespace
	 * @param Array files
	 * @param Function callback
	 * @param Boolean dontInitialize
	 */
	var loadFiles = function(namespace, files, callback, dontInitialize) {
		// Create a key to store them
		if (!app[namespace]) app[namespace] = {};

		// Load the files
		require(files, function() {
			// File loaded, init it now and store it
			files.forEach(function(filePath) {
				var fileParts = filePath.split('/');
				var file = fileParts[fileParts.length - 1];

				// Remove cache busting hash, if any
				if (/\./.test(file)) file = file.replace(/\..+$/, '');

				if (!dontInitialize) app[namespace][file] = new app[namespace][file]();
			});
			
			app.core.log.debug('Loaded ' + namespace + ' (' + files.length + ' files)', 'Zeus/Core');

			// Callback if done loading.
			callback();
		});
	};
});