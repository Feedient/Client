/**
 * Format time as time ago in short unit form (such as 5h for 5 hours)
 * @param Int timestamp
 */
app.helpers.formatTimeAgo = function(timestamp) {
	var seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
	var number, timeAbbr;

	if (seconds <= 0) {
		number = 'now';
		timeAbbr = '';
	} else if (seconds < 60) {
		timeAbbr = 's';
		number = seconds;
	} else if (seconds < 3600) {
		timeAbbr = 'm';
		number = Math.floor(seconds / 60);
	} else if (seconds < 86400) {
		timeAbbr = 'h';
		number = Math.floor(seconds / 60 / 60);
	} else {
		timeAbbr = 'd';
		number = Math.floor(seconds / 60 / 60 / 24);
	}

	return number + timeAbbr;
};

app.helpers.timeAgo = function(postsElement) {
	$(postsElement).find('.time').each(function() {
		var timeoutId,
			$element = $(this),
			timestamp = $element.attr('data-timestamp');

		if ($element.attr('data-has-timeago')) {
			return;
		}

		$element.attr('data-has-timeago', '1');

		/**
		 * Update the time ago text
		 */
		var updateTime = function() {
			$element.html(app.helpers.formatTimeAgo(timestamp));
		};

		/**
		 * Schedule an updateTime call
		 */
		var updateLater = function() {
			var seconds = Math.floor((new Date() - new Date(timestamp)) / 1000),
				refreshRate;

			if (seconds < 60) {
				// Update every 10 seconds
				refreshRate = 10000;
			} else if (seconds < 3600) {
				// Update every minute
				refreshRate = 60000;
			} else if (seconds < 86400) {
				// Update every hour
				refreshRate = 360000;
			} else {
				// Never update
				refreshRate = false;
			}

			if (refreshRate) {
				timeoutId = setTimeout(function() {
					if (!$element[0]) {
						clearInterval(timeoutId);
					}

					updateTime();
					updateLater();
				}, refreshRate);
			}
		};

		updateTime();
		updateLater();
	});
};