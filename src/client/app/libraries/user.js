app.lib.user = function() {
	var self = this;
	var providers = [];
	var token = false;
	var userInfo = false

	/**
	 * Get the user's connected providers
	 * @param Function callback
	 */
	this.getProviders = function(callback, ignoreCache) {
		// Use cache
		if (providers.length > 0 && !ignoreCache) {
			return callback(providers);
		}

		// Reload providers
		loadProviders(false, function() {
			callback(providers);
		});
	};

	/**
	 * Change the order of the user's providers
	 * @param Array providerOrder
	 */
	this.setProviderOrder = function(providerOrder) {
		if (!providers.length) return;

		var order = {};

		// Structure the order data in an accessible way
		for (var i in providerOrder) {
			order[providerOrder[i].providerId] = providerOrder[i].order;
		}

		// Sort the actual providers
		providers.sort(function(a, b) {
			return order[a.id] > order[b.id];
		});
	};

	/**
	 * Check if we got the provider with the given id
	 * @param {String} id
	 */
	this.hasProvider = function(id) {
		if (!providers.length) return false;

		for (var i in providers) {
			if (providers[i].id == id) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Get a provider - requires getProviders to be called before!
	 * @param String id
	 * @return Object
	 */
	this.getProvider = function(id) {
		if (!providers.length) {
			app.core.log.error('getProviders must be called before getProvider!', 'User');
			return;
		}

		for (var i in providers) {
			if (providers[i].id == id) {
				return providers[i];
			}
		}

		return false;
	};

	/**
	 * Get the user email
	 * @return String
	 */
	this.getEmail = function() {
		return userInfo.email;
	};

	/**
	 * Get the user language
	 * @return String
	 */
	this.getLanguage = function() {
		return userInfo.language;
	};

	/**
	 * Get the user id
	 * @return String
	 */
	this.getId = function() {
		return userInfo._id;
	};

	/**
	 * Get the user role
	 * @return String
	 */
	this.getRole = function() {
		return userInfo.role;
	};

	/**
	 * Get API access token
	 * @return String
	 */
	this.getToken = function() {
		if (!token) token = $.cookie('token');

		return token;
	};

	/**
	 * Reload the token from the cookie
	 */
	this.reloadToken = function() {
		token = $.cookie('token');
	};

	/**
	 * Verify that the user actually has a valid API token
	 * @param Object data
	 * @param Function next
	 */
	var verifyToken = function(data, next) {
		if (!self.getToken()) {
			window.location = app.config.path + '/../';
			return;
		}

		app.core.api.get('/user', function(response) {
			app.core.log.debug('Your API token is: ' + token, 'User');
			userInfo = response;

			app.core.i18n.setLocale(userInfo.language);
			app.lib.ui.loader.hide();

			next();
		});
	};


	var isLoadingProviders = false;
	var awaitLoadProviders = [];
	
	/**
	 * Preload user providers
	 * @param Object data
	 * @param Function next
	 */
	var loadProviders = function(data, next) {
		if (isLoadingProviders) {
			return awaitLoadProviders.push(next);
		}

		isLoadingProviders = true;

		app.services.providers.getProviders(function(err, response) {
			// Reset
			providers = [];

			for (var i in response) {
				var providerExists = app.lib.providers.providerExists(response[i].provider.name);

				// Make sure provider is supported
				if (!providerExists) {
					app.core.log.error('Provider class for ' + response[i].provider.name + ' doesn\'t exist', 'User');
				}

				// Make sure it hasn't been added already
				if (providerExists && !self.hasProvider(response[i].id)) {
					providers.push(app.lib.providers.create(response[i].provider.name, response[i]));
				}
			}

			// Handle pending requests
			if (awaitLoadProviders) {
				for (var i in awaitLoadProviders) {
					awaitLoadProviders[i]();
				}

				awaitLoadProviders = [];
				isLoadingProviders = false;
			}


			next();
		});
	};

	app.core.hooks.on('loaded', verifyToken);

	/**
	 * Since provider depends on localization, which is initialized
	 * in the loadAssets hook (after loaded), we must load providers
	 * after the loadAssets hook... which happens to be the 'ready'
	 * hook, just before the first controller runs.
	 */
	app.core.hooks.on('ready', loadProviders);
};