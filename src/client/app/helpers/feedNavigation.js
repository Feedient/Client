(function() {

var handlers;

/**
 * Handle arrow key based navigation in the feeds
 * @param Object handlers { select, deselect }
 */
app.helpers.feedNavigation = function(actionHandlers) {
	if (!actionHandlers || !actionHandlers.select) return app.core.log.error('No "select" handler provided', 'feedNavigation');
	if (!actionHandlers || !actionHandlers.deselect) return app.core.log.error('No "deselect" handler provided', 'feedNavigation');
	if (!actionHandlers || !actionHandlers.enter) return app.core.log.error('No "enter" handler provided', 'feedNavigation');
	if (!actionHandlers || !actionHandlers.back) return app.core.log.error('No "back" handler provided', 'feedNavigation');

	// Hoist the scope
	handlers = actionHandlers;

	// x = column index
	// y = post index
	var position = { x: 0, y: 0 };
	var lastIndex = {};

	app.lib.hotkeys.on('/', 'enter', function() {
		var provider = getProviderByIndex(position.x);

		if (!provider || !provider.posts[position.y]) return;

		handlers.enter(provider, provider.posts[position.y].id);
	});

	app.lib.hotkeys.on('/', 'backspace', function() {
		var providerId = getProviderByIndex(position.x).id;
		var $overlays = $('#overlays-' + providerId).children();

		if (!$overlays.length) return;

		var overlayId = $overlays.last().attr('id').replace('overlay-', '');

		if (!overlayId) return;

		handlers.back(overlayId);
	});

	app.lib.hotkeys.on('/', 'down', function() {
		if (position.y+1 < getPostCount(position.x)) {
			deselectPost(position);
			position.y++;
			selectPost(position);
		}
	});

	app.lib.hotkeys.on('/', 'right', function() {
		if (position.x+1 < getProviderCount()) {
			deselectPost(position);

			lastIndex[position.x] = position.y;
			position.x++;

			if (lastIndex[position.x]) {
				position.y = lastIndex[position.x];
			} else {
				position.y = 0;
			}

			selectPost(position);

			var $column = getProviderElement(position.x);

			if ($column.length && !isVisible($column, $('#main'))) {
				$('#main')[0].scrollLeft = $column.position().left + $('#main')[0].scrollLeft;
			}
		}
	});

	app.lib.hotkeys.on('/', 'up', function() {
		if (position.y > 0) {
			deselectPost(position);
			position.y--;
			selectPost(position);
		}
	});

	app.lib.hotkeys.on('/', 'left', function() {
		if (position.x > 0) {
			deselectPost(position);

			lastIndex[position.x] = position.y;
			position.x--;

			if (lastIndex[position.x]) {
				position.y = lastIndex[position.x];
			} else {
				position.y = 0;
			}

			selectPost(position);

			var $column = getProviderElement(position.x);
			if ($column.length && !isVisible($column, $('#main'))) {
				$('#main')[0].scrollLeft = $column.position().left + $('#main')[0].scrollLeft;
			}
		}
	});

};

/**
 * Select a post by coordinates
 * @param Object coordinates {x, y}
 */
var selectPost = function(coordinates) {
	var x = coordinates.x + 1;
	var $post = $('#main .column:nth-child(' + x + ') .post:nth-child(' + (coordinates.y+1) + ')');
	if (!$post.length) return;

	// realValue = topValue + scrollTop
	$post.parents('.posts')[0].scrollTop = $post.position().top + $post.parents('.posts')[0].scrollTop;

	handlers.select($post);
};

/**
 * Deselect a post by coordinates
 * @param Object coordinates {x, y}
 */
var deselectPost = function(coordinates) {
	var x = coordinates.x + 1;
	var $post = $('#main .column:nth-child(' + x + ') .post:nth-child(' + (coordinates.y+1) + ')');
	if (!$post.length) return;

	handlers.deselect($post);
};

/**
 * Get provider column
 * @param Int providerIndex
 * @return Object
 */
var getProviderElement = function(providerIndex) {
	var x = providerIndex + 1;

	return $('#main .column:nth-child(' + x + ')');
};

/**
 * Get provider by order index
 * @param Int providerIndex
 * @return Object
 */
var getProviderByIndex = function(providerIndex) {
	var x = providerIndex + 1;

	var $provider = $('#main .column:nth-child(' + x + ')');

	if (!$provider.length) return;

	var providerId = $provider.attr('id').replace('column-', '');

	return app.lib.user.getProvider(providerId);
};

/**
 * Get post count for a specific provider
 * @param Int providerIndex
 * @return Int
 */
var getPostCount = function(providerIndex) {
	var provider = getProviderByIndex(providerIndex);

	return (provider) ? provider.posts.length : 0;
};

/**
 * Get the count of provider columns
 * @return Int
 */
var getProviderCount = function() {
	return $('#main .column').length;
};

/**
 * Check if an element is visible in a scroll view
 * @param Object element
 * @param Object parent
 */
var isVisible = function($elem, $parent) {
	var left = $parent.scrollTop();
	var right = left + $parent.width();

	var elemLeft = $elem.offset().left;
	var elemRight = elemLeft + $elem.width();

	return ((elemRight <= right) && (elemLeft >= left));
}

}());
