app.helpers.scrollWatch = function(provider, triggerMargin, callback) {
	var $element = $('#posts-' + provider._id);
	var isTriggered = false;

	var reset = function() {
		isTriggered = false;
	};

	var scrollHandler = function() {
		if (!isTriggered && $element.scrollTop() + $element.height() > $element.prop('scrollHeight') - triggerMargin) {
			isTriggered = true;
			callback(provider, reset);
		}
	};

	$element.on('scroll', scrollHandler);
};