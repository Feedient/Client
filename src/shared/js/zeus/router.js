app.core.router = function() { 
	'use strict';
	
	var hooks = {};
	var self = this;
	var errorHandler = false;

	this.active = false;
	
	/**
	 * Click listener for links
	 * @param Event event
	 */
	var handleClick = function(event) {
		// Get the URL
		var link = $(this).attr('href');
		
		if (link && link !== 'javascript:void(0)') {
			// Load the page
			self.routeTo(link);
	
			// Send it to the browser history
			history.pushState(null, null, link);
	
			// Prevent site from refreshing
			event.preventDefault();
		}
	};
	
	/**
	 * Assign click listeners to all internal links
	 * @param String parentSelector
	 */
	this.assignEvents = function(parentSelector) {
		if (!history.pushState) return;

		var selector = 'a';

		if (parentSelector) {
			selector = parentSelector + ' ' + selector;
		}

		// Assign AJAX loading behavior
		$(selector).each(function() {
			var $element = $(this);

			// Make sure it has not been assigned already and is not an external link
			if ($element.attr('data-hasevents') != '1' 
			&& $element.attr('target') != '_blank'
			&& !/http(s)?:\/\//.test($element.attr('href'))
			&& $element.attr('data-direct') != '1') {
				$element.attr('data-hasevents', '1');
				$element.on('click', handleClick);
			}
		});
	};
	
	/**
	 * Listen for 404 errors
	 * @param Function callback
	 */
	this.error = function(callback) {
		errorHandler = callback;
	};
	
	/**
	 * Attach a controller to an URL
	 * @param String call
	 * @param Function object
	 */
	this.get = function(call, object) {
		hooks[call] = object;
	};
	
	/**
	 * Load an URL from the hooked controllers
	 * @param String url
	 */
	this.routeTo = function(url) {
		// Remove the base path from the URL
		url = url.replace(app.config.path, '');
	
		// Rewrite ./ to /
		if (/^\.\/$/.test(url)) {
			url = '/';
		}
	
		// Force / in the beginning of URL
		if (!/^\//.test(url)) {
			url = '/' + url;
		}
	
		// Remove / from the end
		if (url != '/' && /\/$/.test(url)) {
			url = url.substr(0, url.length - 1);
		}
	
		self.active = url;

		app.core.hooks.trigger('route', { path: self.active }, function() {
			// Try to find a controller in the hooks
			if (typeof hooks[url] != 'undefined') {
				app.core.log.debug('Routed to controller [' + url + ']', 'Zeus/Router');
				window.app.controller = new hooks[url]();
			} else {
				app.core.log.warning('Controller [' + url + '] not found', 'Zeus/Router');
				
				if (errorHandler) {
					window.app.controller = new errorHandler();
				}
			}
		});
	};

	/**
	 * Load the default controller
	 */
	app.core.hooks.on('ready', function(data, next) {
		// Check for HTML5 pushState support
		if (history.pushState) {
			app.core.log.debug('Initialized router', 'Zeus/Router');

			$(window).bind('popstate', function() {
				self.routeTo(window.location.pathname);
			});
	
			self.assignEvents();
			self.routeTo(window.location.pathname);
			next();
		}
	});
};