/**
 * Format the number by adding "k" for thousand etc.
 * Limited to three numbers (by rounding to x decimals)
 * @param Int number
 * @return String
 */
app.helpers.formatNumber = function(number) {
	if (number >= 1000000) {
		// 1.11m
		number = (number / 1000000).toFixed(2) + 'm';
	} else if (number >= 100000) {
		// 111k
		number = (number / 1000).toFixed(0) + 'k';
	} else if (number >= 10000) {
		// 11.1k
		number = (number / 1000).toFixed(1) + 'k';
	} else if (number >= 1000) {
		// 1.11k
		number = (number / 1000).toFixed(2) + 'k';
	}

	return number;
};

Handlebars.registerHelper('formatNumber', app.helpers.formatNumber);