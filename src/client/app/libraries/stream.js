app.lib.stream = function() {
	var socket;
	var socketHandlers = {};
	var awaitListeners = {};
	var optionReconnectTimeout = 5000; // 5 second by default
	var optionReconnectDelayIncrease = 1000; // Increase delay 500ms / reconnect fail
	var optionHeartbeatTimeout = 65000; // 65 seconds heartbeat timeout before reconnecting
	var isTryingToReconnect = false;
	var timeoutId = null;

	// Global variables
	var reconnectTimeout = optionReconnectTimeout;

	app.core.hooks.on('ready', function(data, next) {
		if (!socket) {
			app.core.log.debug('Connecting to stream server', 'Stream');
			socket = new SockJS(app.config.API + '/echo', null, { heartbeatTimeout: optionHeartbeatTimeout });

			streamManager();
		}

		next();
	});

	/**
	 * Listen for realtime events for a specific provider
	 * @param Array provider
	 * @param Function callback
	 */
	this.open = function(provider, callback) {
		app.core.log.debug('Added stream handler for ' + provider.id, 'Stream');

		socketHandlers[provider.id] = {
			provider: provider,
			callback: callback
		};
	};

	/**
	 * Wait for the next post by a specific postId and catch it before it shows up
	 * @param String providerId
	 * @param String postId
	 * @param Function callback
	 */
	this.await = function(providerId, postId, callback) {
		if (!awaitListeners[providerId]) {
			awaitListeners[providerId] = {};
		}

		awaitListeners[providerId][postId] = callback;
		app.core.log.debug('Added stream await listener for ' + providerId + ', post ID: ' + postId, 'Stream');
	};

	/**
	 * Fake a stream 'post' event
	 * @param String providerId
	 * @param Array posts
	 */
	this.inject = function(providerId, posts) {
		_handlePost({
			provider: providerId,
			posts: posts
		});
	};

	var _handlePost = function(data) {
		if (!socketHandlers[data.provider]) {
			return app.core.log.warning('Received stream data for unsupported provider: ' + data.provider, 'Stream');
		}

		var providerName = socketHandlers[data.provider].provider.providerName;
		var providerId = socketHandlers[data.provider].provider.id;
		var provider = app.lib.user.getProvider(providerId);
		console.log("getProvider in stream.js");
		console.log("Size: " + provider.posts.length);

		var totalCount = data.posts.length;

		for (var i in data.posts) {
			// Catch the post if there is an awaitListener
			if (awaitListeners[providerId] && awaitListeners[providerId][data.posts[i].id]) {
				app.core.log.debug('Called await listener for ' + providerId + ', post ID: ' + data.posts[i].id, 'Stream');
				awaitListeners[providerId][data.posts[i].id](data.posts[i], data.provider);

				// Clear the await listener
				awaitListeners[providerId][data.posts[i].id] = undefined;
				data.posts[i] = undefined;
			// Avoid duplicates! Sometimes we receive the same post twice
			} else if (provider.postExists(data.posts[i])) {
				// Soft-delete
				data.posts[i] = undefined;
			} else {
				provider.posts.unshift(data.posts[i]);
			}
		}

		// Remove soft-deleted posts
		data.posts = data.posts.filter(function(n) {
			return n;
		});

		app.core.log.debug('Added ' + data.posts.length + ' (of ' + totalCount + ') posts to ' + data.provider + ' [' + provider.formattedName + ']', 'Stream');

		if (app.core.router.active == '/') {
			socketHandlers[data.provider].callback(socketHandlers[data.provider].provider, data.posts);
		}
	};

	/**
	 * Route and handle realtime events
	 */
	var streamManager = function() {
		// On opening of the socket, send the initial authenticate message
		socket.onopen = function() {
			app.core.log.debug('Socket connection opened', 'Stream');

			if (isTryingToReconnect) {
				isTryingToReconnect = false;
				app.lib.ui.toast('Realtime connection established', 'fa-check');
				reconnectTimeout = optionReconnectTimeout; // Reset reconnectTimeout
			}

			_authenticateSocket();
		};

		socket.onmessage = function(message) {
			_handleMessage(message.data);
		};

		socket.onclose = function() {
			// Reconnect, show message once.
			if (!isTryingToReconnect) {
				app.core.log.debug('Socket connection closed', 'Stream');
				app.lib.ui.toast('Lost realtime connection. Trying to reconnect...', 'fa-refresh');
			}

			timeoutId = setTimeout(function () {
				_handleReconnect()
			}, reconnectTimeout);
		};
	};

	var _handleReconnect = function() {
		app.core.log.debug('Trying to reconnect', 'Stream');

		isTryingToReconnect = true;

		socket = null;
		clearTimeout(timeoutId);

		// If we were reconnecting already, increase the timeout
		if (isTryingToReconnect) {
			reconnectTimeout += optionReconnectDelayIncrease;
		}

		// Try to open the connection
		socket = new SockJS(app.config.API + '/echo', null, { heartbeatTimeout: optionHeartbeatTimeout });

		// Open the listeners
		streamManager();
	};

	var _authenticateSocket = function() {
		var message = JSON.stringify({ "type": "authenticate", "message" : { "token": app.lib.user.getToken() }});
		socket.send(message);
	};

	var _handleNotification = function(message) {
		app.core.log.debug('Notification received', 'Stream');
		console.log(message);
		var provider = app.lib.user.getProvider(message.provider);

		if (!provider) return;

		provider.addNotifications(message.notifications, true);
	};

	var _handleMessage = function(message) {
		try {
			var parsed = JSON.parse(message);
			if (parsed.type && parsed.content) {
				switch (parsed.type) {
					case 'post':
						_handlePost(parsed.content);
						break;
					case 'notification':
						_handleNotification(parsed.content);
						break;
					case 'error':
						app.core.log.error(data || data.message, 'Stream');
						break;
					case 'notice':
						app.core.log.debug(data.message, 'Stream');
						break;
				}
			} else {
				console.log(parsed);
			}
		} catch (e) {
			console.log(e.message);
		}
	};
};
