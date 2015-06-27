app.lib.hotkeys = function() {
	var hooks = {};

	var keyMap = {
		// Navigating posts
		'down': 40,
		'right': 39,
		'up': 38,
		'left': 37,
		'enter': 13,
		'backspace': 8,

		// Hiding modals
		'escape': 27,

		// Various shortcuts
		'n': 78, // compose
		'c': 67, // compose

		// Column switching
		'1': 49,
		'2': 50,
		'3': 51,
		'4': 52,
		'5': 53,
		'6': 54,
		'7': 55,
		'8': 56,
		'9': 57
	};

	/**
	 * Listen for a specific key event
	 * @param String route
	 * @param String key
	 * @param Function callback
	 */
	this.on = function(route, key, callback) {
		if (!hooks[route]) hooks[route] = {};
		hooks[route][keyMap[key]] = callback;
		app.core.log.debug('Added hotkey handler for ' + key + ' (' + keyMap[key] + ')', 'Hotkeys');
	};

	$(window).on('keydown', function(e) {
		// Don't trigger the events if keypress is caused on an input
		if (e.keyCode != keyMap.escape && ['input', 'textarea'].indexOf(e.target.tagName.toLowerCase()) != -1) return;
		
		// Don't trigger the events for native shortcuts (copy, paste etc)
		if (e.metaKey || e.ctrlKey || e.altKey) return;

		if (hooks[app.core.router.active] && hooks[app.core.router.active][e.keyCode]) {
			hooks[app.core.router.active][e.keyCode]();
			e.preventDefault();
		} else if(hooks['*'] && hooks['*'][e.keyCode]) {
			hooks['*'][e.keyCode]();
			e.preventDefault();
		}
	});
};