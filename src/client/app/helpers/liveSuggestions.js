app.helpers.liveSuggestions = function(delay, handler) {
	var self = this;
	var lastTime = 0;
	var lastSearchAttempt;

	/** 
	 * Schedule a new search attempt to avoid spamming the server with requests
	 * @param String value
	 * @param Date currentTime
	 */
	var scheduleSearchAttempt = function(value, currentTime) {
		setTimeout(function() {
			if (lastSearchAttempt != value) {
				return;
			}

			self.search(value);
		}, delay - (currentTime - lastTime));
	};

	/**
	 * Attempt to search
	 * @param String value
	 */
	this.search = function(value) {
		var currentTime = new Date();

		lastSearchAttempt = value;

		// Has enough time passed?
		if (value && currentTime - lastTime < delay) {
			return scheduleSearchAttempt(value, currentTime);
		}

		lastTime = currentTime;
		handler(value);
	};
};