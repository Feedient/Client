app.services.providers = function() {
	/**
	 * Get the user's providers
	 * @param Function callback(err, response)
	 */
	this.getProviders = function(callback) {
		app.core.api.get('/provider', function(response) {
			return callback(null, response);
		});
	};

	/**
	 * Get the feed before a specific time or post ID
	 * @param String providerId
	 * @param String parameter
	 * @param Function callback(response)
	 */
	this.getOlderFeed = function(providerId, parameter, callback) {
		app.core.api.get('/provider/' + providerId + '/feed/' + parameter, callback);
	};
	
	/**
	 * Get the feed for a specific provider
	 * @param String providerId
	 * @param Function callback(response)
	 */
	this.getFeed = function(providerId, callback) {
		app.core.api.get('/provider/' + providerId + '/feed', callback);
	};

	/**
	 * Post a message to a list of providers
	 * @param Array providers
	 * @param String message
	 * @param Function callback(err, response)
	 */
	this.postMessage = function(providers, message, callback) {
		app.core.api.post('/providers/message', { providers: providers, message: message }, function(response) {
			return callback(null, response);
		});
	};

	/**
	 * Post a message with a photo to a list of providers
	 * @param Array providers
	 * @param String message
	 * @param File picture
	 * @param Function callback(err, response)
	 */
	this.postMessageWithPicture = function(providers, message, picture, callback) {
		var formData = new FormData();
		formData.append('providers', providers);
		formData.append('picture', picture);

		// Append pictures
		// for (var i = 0; i < pictures.length; i++) {
		//     // check the type
		//     if (!pictures[i].type.match('image.*')) {
		//         continue;
		//     }
		//
		//     formData.append('picture', pictures[i], pictures[i].name);
		// }

		if (message) {
			formData.append('message', message);
		}

		//{ providers: providers, pictures: pictures, message: message }
		app.core.api.post('/providers/pictures', formData, { }, { hasContentType: false, hasProcessData: false }, function(response) {
			return callback(null, response);
		});
	};
};
