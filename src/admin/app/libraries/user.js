app.lib.user = function() {
	var self = this;
	var providers = false;
	var token = false;
	var userInfo = false;

	/**
	 * Get API access token
	 * @return String
	 */
	this.getToken = function() {
		if (!token) token = $.cookie('token');

		return token;
	};

	/**
	 * Verify that the user actually has a valid API token
	 * @param Object data
	 * @param Function next
	 */
	this.verifyToken = function(data, next) {
		if (!self.getToken()) {
			window.location = app.config.path + '/../';
			return;
		}

		app.core.api.get('/user', function(response) {
			app.core.log.debug('Your API token is: ' + token, 'User');
			userInfo = response;

			if (userInfo.role != 'ADMIN') {
				window.location = app.config.path + '/../';
			}

			next();
		});
	};

	app.core.hooks.on('loaded', this.verifyToken);
};