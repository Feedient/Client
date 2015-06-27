// Remove the home cookie so the user will get redirected to the app immediately
$.removeCookie('home', { path: '/' });

// Add the API authentication "Bearer" header token
app.core.api.addHeader('Bearer', app.lib.user.getToken);

/**
 * Handle API errors
 * @param Int httpStatus
 */
app.core.api.onError(function(httpStatus) {
	if (httpStatus == 401) {
		$.removeCookie('token', { path: '/' });
		window.location = app.config.path + '/../';
		return;
	}

	app.lib.ui.loader.hide();
	app.lib.ui.modal.show('modals/api-error', { status: httpStatus });
});

/**
 * Handle authentication error check on the successful API responses
 * @param Array data
 * @param Function callback(data)
 */
app.core.api.onSuccess(function(data, callback) {
	if (data && data.error) {
		if (data.error.type == 'AuthException') {
			app.core.log.error('Failed to load API, authorization error', 'Setup');
			app.lib.ui.loader.hide();
			app.core.view.render('pages/api-auth-error', { error: data.error });
			return;
		}

		if (data.error.type == 'OAuthException' && data.error.code == 1000) {
			app.core.log.error('OAuth token error, asking user to re-authorize...', 'Setup');
			app.lib.ui.loader.hide();

			$.cookie('reauthorize', data.error.providerId, { expires: 365, path: '/' });

			if (window.location.pathname != '/app/settings') {
				window.location = '/app/settings';
			}

			return;
		}

		if (data.error.type == 'OAuthException' && data.error.code == 1006) {
			app.core.log.error('OAuth token error, asking user to re-authorize with more permissions...', 'Setup');
			app.lib.ui.loader.hide();

			$.cookie('reauthorize-permissions', data.error.providerId, { expires: 365, path: '/' });

			if (window.location.pathname != '/app/settings') {
				window.location = '/app/settings';
			}

			return;
		}
	}

	if (callback) callback(data);
});

/**
 * Check if the browser is compatible with Feedient/Zeus
 * @param Object data
 * @param Function next
 */
app.core.hooks.on('loaded', function(data, next) {
	if (app.config.technology) {
		for (var i in app.config.technology) {
			if (!Modernizr[app.config.technology[i]]) {
				$.get(app.config.path + '/app/views/pages/unsupported.html', function(source) {
					// Hardcoded view data because IE is... believe it or not; IE.
					source = source.replace('{{technology}}', app.config.technology[i]);

					$('#loading').hide();
					$('#main').html(source);
				});

				return;
			}
		}
	}

	// No mobile browsers, we don't support those right now
	if(/Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent) && !$.cookie('mobile')) {
		app.allowMobile = function() {
			$.cookie('mobile', '1', { expires: 365, path: '/' });
			window.location.reload();
		};

		$.get(app.config.path + '/app/views/pages/mobile.html', function(source) {
			$('#loading').hide();
			$('#main').html(source);
		});

		return;
	}

	// Check for adblock
	$('#main').html('<div class="twitter" style="font-size:12px;height:5px;"></div>');

	if (!$('#main .twitter').height() && !$.cookie('allowAdblock')) {
		app.allowAdBlock = function() {
			$.cookie('allowAdblock', '1', { expires: 365, path: '/' });
			window.location.reload();
		};

		$.get(app.config.path + '/app/views/pages/adblock.html', function(source) {
			$('#loading').hide();
			$('#main').html(source);
		});

		return;
	}

	next();
});

app.core.hooks.on('route', function(data, next) {
	// Count the route change as a Google Analytics pageview
	ga('send', 'pageview');

	next();
});

setInterval(function() {
	// Send a GA pageview every minute
	ga('send', 'pageview');

	// Refresh ads every minute
	if (window.googletag) {
		window.googletag.pubads().refresh();
	}
}, 1000 * 60);
