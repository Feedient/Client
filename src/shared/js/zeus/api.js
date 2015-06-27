app.core.api = function() {
	'use strict';

	var errorHandler;
	var successHandler;
	var customHeaders = {};
	var self = this;

	/**
	 * Format the URL with access token and API URL
	 * @param String endpoint
	 * @return String
	 */
	var formatURL = function(endpoint) {
		return app.config.API + endpoint;
	};

	/**
	 * Display a nice error message if the request failed
	 * @param XMLHttpRequest request
	 * @param String textStatus
	 * @param String error
	 */
	var handleError = function(request, textStatus, error) {
		if (errorHandler) {
			return errorHandler(request.status);
		}

		app.core.log.warning('No API error handler specified.', 'Zeus/API');
		app.core.log.error('API responded with status ' + request.status, 'Zeus/API');
	};

	/**
	 * Merge HTTP headers with custom headers
	 * @param Object headers
	 * @return Object
	 */
	var getHeaders = function(headers) {
		if (!headers) var headers = {};

		if (customHeaders) {
			for (var i in customHeaders) {
				if (typeof customHeaders[i] == 'function') {
					headers[i] = customHeaders[i]();
				} else {
					headers[i] = customHeaders[i];
				}
			}
		}

		return headers;
	};

	/**
	 * Handle successful API requests
	 * @param Mixed data
	 * @param Function callback(data)
	 */
	var handleSuccess = function(data, callback) {
		if (!successHandler) {
			return callback(data);
		}

		successHandler(data, callback);
	};

	/**
	 * Listen for API errors
	 * @param Function callback(httpStatus)
	 */
	this.onError = function(callback) {
		errorHandler = callback;
	};

	/**
	 * Listen for successful API calls
	 * @param Function callback(data, successCallback)
	 */
	this.onSuccess = function(callback) {
		successHandler = callback;
	};

	/**
	 * Add a custom HTTP header to every API request
	 * @param String key
	 * @param String/Function value
	 */
	this.addHeader = function(key, value) {
		customHeaders[key] = value;
	};

	/**
	 * Make a GET request to the API server
	 * @param String endpoint
	 * @param Function callback
	 */
	this.get = function(endpoint, headers, callback, errorHandler) {
		// If headers is not defined
		if (typeof headers == 'function') {
			errorHandler = callback;
			callback = headers;
			headers = {};
		}

		var mergedHeaders = _mergeObject(getHeaders(), headers);

		app.core.log.debug('Calling API endpoint [GET ' + endpoint + ']', 'Zeus/API');

		$.ajax({
			url: formatURL(endpoint),
			headers: mergedHeaders,
			type: 'GET',
			success: function(data) {
				handleSuccess(data, callback);
			},
			error: function(request) {
				if (errorHandler) return errorHandler(endpoint, request);

				handleError(request);
			}
		});
	};

	/**
	 * Make a POST request to the API server
	 * headers is optional, if it is not set we will have: function(endpoint, data, callback, errorHandler)
	 *
	 * @param Array ajaxOptions optional possible parameters: [ hasContentType, hasProcessData ]
	 * @param String endpoint
	 * @param Function callback
	 */
	this.post = function(endpoint, data, headers, ajaxOptions, callback, errorHandler) {
		// If headers is callback
		if (typeof headers == 'function') {
			callback = headers;
			headers = {};
			errorHandler = ajaxOptions;
			ajaxOptions = {};
		}

		// If ajaxOptions is callback
		if (typeof ajaxOptions == 'function') {
			callback = ajaxOptions;
			ajaxOptions = {};
			errorHandler = callback;
		}

		var mergedHeaders = _mergeObject(getHeaders(), headers);
		app.core.log.debug('Calling API endpoint [POST ' + endpoint + ']', 'Zeus/API');

		$.ajax({
			url: formatURL(endpoint),
			headers: mergedHeaders,
			type: 'POST',
			data: data,
			contentType: ajaxOptions.hasContentType,
			processData: ajaxOptions.hasProcessData,
			success: function(data) {
				handleSuccess(data, callback);
			},
			error: function(request) {
				if (errorHandler) return errorHandler(endpoint, request);

				handleError(request);
			}
		});
	};

	/**
	 * Make a POST request to the API server
	 * @param String endpoint
	 * @param Function callback
	 */
	this.put = function(endpoint, data, headers, callback, errorHandler) {
		// If headers is not defined
		if (typeof headers == 'function') {
			errorHandler = callback;
			callback = headers;
			headers = {};
		}

		var mergedHeaders = _mergeObject(getHeaders(), headers);

		app.core.log.debug('Calling API endpoint [POST ' + endpoint + ']', 'Zeus/API');

		$.ajax({
			url: formatURL(endpoint),
			headers: mergedHeaders,
			type: 'PUT',
			data: data,
			success: function(data) {
				handleSuccess(data, callback);
			},
			error: function(request) {
				if (errorHandler) return errorHandler(endpoint, request);

				handleError(request);
			}
		});
	};

	/**
	 * Make a DELETE request to the API server
	 * @param String endpoint
	 * @param Function callback
	 */
	this.delete = function(endpoint, data, headers, callback, errorHandler) {
		// If headers is not defined
		if (typeof headers == 'function') {
			errorHandler = callback;
			callback = headers;
			headers = {};
		}

		var mergedHeaders = _mergeObject(getHeaders(), headers);

		app.core.log.debug('Calling API endpoint [DELETE ' + endpoint + ']', 'Zeus/API');

		$.ajax({
			url: formatURL(endpoint),
			headers: mergedHeaders,
			type: 'DELETE',
			data: data,
			success: function(data) {
				handleSuccess(data, callback);
			},
			error: function(request) {
				if (errorHandler) return errorHandler(endpoint, request);

				handleError(request);
			}
		});
	};

	var _mergeObject = function(object1, object2) {
		for (var i in object2) {
			object1[i] = object2[i];
		}

		return object1;
	}
}