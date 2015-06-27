app.core.i18n = function() {
	var self = this;
	var isLoaded = false;
	var defaultLocale = app.config.localization.defaultLocale;
	var userLocale = defaultLocale;
	var extendLocale = false;
	var localeData = {};

	/**
	 * Change the locale
	 * @param String newLocale
	 */
	this.setLocale = function(newLocale) {
		// Prevent change after files have been loaded
		if (isLoaded) {
			app.core.log.warning('Locale may not be changed after files have been loaded. Locale change should occur in the "loaded" hook.', 'Zeus/Localization');
			return;
		}

		// Make sure locale is supported
		if (!app.config.localization.locales[newLocale]) {
			app.core.log.warning('Locale ' + newLocale + ' does not exist in app.config.localization.locales', 'Zeus/Localization');
			return;
		}

		var userLocaleData = app.config.localization.locales[newLocale];
		extendLocale = (typeof userLocaleData != 'string') ? userLocaleData.extend : '';

		userLocale = newLocale;
	};

	/**
	 * Check if a locale property exists
	 * @param String locale
	 * @param String file
	 * @param String namespace
	 * @param String subNamespace
	 * @param String property
	 * @return Boolean
	 */
	var propertyExists = function(locale, file, namespace, subNamespace, property) {
		// Does the file and namespace exist?
		if (localeData[locale] && localeData[locale][file] && localeData[locale][file][namespace]) {
			var namespaceObject = localeData[locale][file][namespace];

			// Is there no property? (as in, the namespace is the property)
			if (!property && typeof namespaceObject == 'string') {
				return true;
			}

			// Is the item an object and does it contain the property?
			if (typeof namespaceObject == 'object') {
				if (!subNamespace && namespaceObject[property]) {
					return true;
				}

				if (subNamespace && namespaceObject[subNamespace] && namespaceObject[subNamespace][property]) {
					return true;
				}
			}
		}

		return false;
	};

	/**
	 * Get a locale property
	 * @param String locale
	 * @param String file
	 * @param String namespace
	 * @param String subNamespace
	 * @param String property
	 * @param String properties
	 * @return String
	 */
	var getProperty = function(locale, file, namespace, subNamespace, property, properties) {
		var localeString;

		if (property && subNamespace) {
			localeString = localeData[locale][file][namespace][subNamespace][property];
		} else if (property && !subNamespace) {
			localeString = localeData[locale][file][namespace][property];
		} else {
			localeString = localeData[locale][file][namespace];
		}
		
		if (properties) {
			for (var i in properties) {
				localeString = localeString.replace('{{' + i + '}}', properties[i]);
			}
		}

		return localeString;
	};

	/**
	 * Get a localized string
	 * @param String key
	 * @param Object properties
	 * @return String
	 */
	this.get = function(key, properties) {
		// Compatibility with i18next string key notation
		if (/:/.test(key)) key = key.replace(':', '.');

		var pieces = key.split('.');
		var levels = pieces.length;

		if (levels <= 1) {
			app.core.log.warning('Invalid localization property [' + key + ']', 'Zeus/Localization');
			return key;
		}
		
		// Prevent misunderstanding for deeply nested properties
		if (levels >= 5) {
			app.core.log.warning('Localization property format is file.namespace.namespace.property, file.namespace.property or file.property', 'Zeus/Localization');
			return key;
		}

		var file = pieces[0];
		var namespace = pieces[1];
		var subNamespace = false;
		var property = false;

		if (levels == 4) {
			property = pieces[3];
			subNamespace = pieces[2];
		} else if (levels == 3) {
			property = pieces[2];
		}

		// First attempt: user locale
		if (propertyExists(userLocale, file, namespace, subNamespace, property)) {
			return getProperty(userLocale, file, namespace, subNamespace, property, properties);
		}

		// Second attempt: user locale's extend locale
		if (extendLocale && propertyExists(extendLocale, file, namespace, subNamespace, property)) {
			return getProperty(extendLocale, file, namespace, subNamespace, property, properties);
		}

		// Third attempt: default locale
		if (userLocale != defaultLocale && defaultLocale != extendLocale && propertyExists(defaultLocale, file, namespace, subNamespace, property)) {
			return getProperty(defaultLocale, file, namespace, subNamespace, property, properties);
		}

		app.core.log.warning('Could not find localization property [' + key + ']', 'Zeus/Localization');
		return key;
	};

	/**
	 * Load all specified locale files and parse their content
	 * @param Function callback
	 */
	var loadFiles = function(locale, callback) {
		app.core.log.debug('Started loading files for ' + locale, 'Zeus/Localization');
		var files = app.config.localization.files;

		// Make sure there are files to load
		if (!files.length) {
			app.core.log.warning('No locale files to be loaded', 'Zeus/Localization');
			return;
		}

		localeData[locale] = {};

		var loadFunctions = [];
	
		// Loop through the list of files
		for (var i in files) {
			(function(fileName) {
				// Schedule a parallel loading function
				loadFunctions.push(function(parallelCallback) {
					$.ajax({
						url: app.config.path + '/app/locales/' + locale + '/' + fileName + '.json',
						type: 'GET',
						success: function(source){ 
							app.core.log.debug('Loaded localization file [' + locale + '/' + fileName + ']', 'Zeus/Localization');

							if (typeof source == 'string') {
								try {
									var data = JSON.parse(source);
								} catch (error) {
									app.core.log.error(error);
									parallelCallback();
									return;
								}
							} else {
								var data = source;
							}

							localeData[locale][fileName] = data;
							parallelCallback();
						},
						error: function(data) {
							app.core.log.warning('Failed to load locale file [' + locale + '/' + fileName + ']', 'Zeus/Localization');
							parallelCallback();
						}
					});
				});
			}(files[i]));
		};
	
		// Load the above functions in parallel
		async.parallelLimit(loadFunctions, app.config.localization.parallelLimit, callback);
	};

	// Load all necessary locale files
	app.core.hooks.on('preloadAssets', function(data, next) {
		var loadFunctions = [
			function(callback) {
				loadFiles(userLocale, callback);
			}
		];

		// If the user locale inherits another locale, we need to load that one as well
		if (extendLocale) {
			loadFunctions.push(function(callback) {
				loadFiles(extendLocale, callback);
			});
		}

		// If the user locale isn't the default locale, we need to load the default one as well
		if (userLocale != defaultLocale && extendLocale != defaultLocale) {
			loadFunctions.push(function(callback) {
				loadFiles(defaultLocale, callback);
			});
		}

		async.series(loadFunctions, function() {
			// Translate static views by attribute
			$('[data-i18n]').each(function() {
				var $this = $(this);
				$this.html(app.core.i18n.get($this.attr('data-i18n')));
			});

			next();
		});
	});

	// Register Handlebars helper
	Handlebars.registerHelper('i18n', function(key, properties, stringTransform) {
		var result = self.get(key, properties);

		if (stringTransform && typeof stringTransform == 'string') {
			result = result[stringTransform]();
		}

		return new Handlebars.SafeString(result);
	});
};