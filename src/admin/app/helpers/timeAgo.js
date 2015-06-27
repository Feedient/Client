/**
 * Format time as time ago in short unit form (such as 5h for 5 hours ago)
 * @param Int timestamp
 */
app.helpers.timeAgo = function(timestamp) {
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

Handlebars.registerHelper('timeAgo', app.helpers.timeAgo);