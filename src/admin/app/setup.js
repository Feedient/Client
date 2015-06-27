// Add the API authentication "Bearer" header token
app.core.api.addHeader('Bearer', app.lib.user.getToken);

/**
 * Handle API errors
 * @param Int httpStatus
 */
app.core.api.onError(function(httpStatus) {
	if (httpStatus == 401) {
		window.location = app.config.path + '/../';
		return;
	}

	app.core.view.render('error', { code: httpStatus });
});

/**
 * Do some browser compatibility check
 * @param Object data
 * @param Function next
 */
app.core.hooks.on('loaded', function(data, next) {
	if (!history || !history.pushState) {
		// Show some error.

		return;
	}

	next();
});