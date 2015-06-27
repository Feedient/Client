app.lib.providers = function() {
	var providers = {};
	var tempAuth = {};
	var base;

	this.setBase = function(provider) {
		base = provider;
	};

	/**
	 * Add a provider class
	 * @param String name
	 * @param Function proto
	 */
	this.add = function(name, provider) {
		app.core.log.debug('Registered provider [' + name + ']', 'Providers');
		providers[name] = provider;
	};

	/**
	 * Create a provider instance
	 * @param String name
	 * @param Object data
	 */
	this.create = function(name, data) {
		return new providers[name](new base(data), data);
	};

	/**
	 * Check if a provider exists or not
	 * @param String name
	 * @return Boolean
	 */
	this.providerExists = function(name) {
		return !!providers[name];
	};

	/**
	 * Get a list of all providers with their name, icon and disabled state
	 * @return Array
	 */
	this.getList = function() {
		var availableProviders = [];

		var item;

		for (var name in app.config.providers) {
			item = app.config.providers[name];
			item.name = name;
			availableProviders.push(item);
		}

		return availableProviders;
	};

	/**
	 * Show the OAuth authorization popup
	 * @param String name
	 */
	this.authorize = function(name) {
		if (!this.providerExists(name)) return;

		tempAuth[name] = new providers[name](new base(false), false);
		tempAuth[name].authorize.popup();
	};

	/**
	 * Call the OAuth callback
	 * @param String name
	 * @param Object data
	 * @param Function callback
	 */
	this.callback = function(name, data, callback) {
		if (!this.providerExists(name) || !tempAuth[name]) return;

		tempAuth[name].authorize.callback(data, callback);
	};
};
