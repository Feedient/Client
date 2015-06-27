app.lib.metrics = function() {
	var providerAccountCounts = {};
	var providerAccountListeners = {};
	var providerAccountCallback;

	/**
	 * Get the current socket connection count
	 * @param Function callback(count)
	 */
	this.getUsersOnline = function(callback) {
		app.core.api.get('/metrics/last/socket.connected', function(data) {
			callback(data.value);
		});
	};

	/**
	 * Get the total user count
	 * @param Function callback(count)
	 */
	this.getTotalUsers = function(callback) {
		app.core.api.get('/metrics/count/f/users', function(data) {
			callback(data.count);
		});
	};

	this.getRecurringLastMonth = function(callback) {
		var date = new Date();
		var monthStart = new Date(date.getFullYear(), date.getMonth() - 1, 1);
		var monthEnd = new Date(date.getFullYear(), date.getMonth(), 0);

		var recurringQuery = JSON.stringify({
			timestamp: {
				$gte: monthStart.toISOString(),
				$lt: monthEnd.toISOString()
			}
		});

		app.core.api.get('/metrics/count/m/account.login/' + encodeURIComponent(recurringQuery), function(data) {
			callback(data.count);
		});
	};

	/**
	 * Get the count of new users for today
	 * @param Function callback(count)
	 */
	this.getNewUsersToday = function(callback) {
		var todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);
		var todayEnd = new Date();
		todayEnd.setDate(todayStart.getDate() + 1);
		todayEnd.setHours(0, 0, 0, 0);

		var todayQuery = JSON.stringify({
			timestamp: {
				$gte: todayStart.toISOString(),
				$lt: todayEnd.toISOString()
			}
		});

		app.core.api.get('/metrics/count/m/account.register/' + encodeURIComponent(todayQuery), function(data) {
			callback(data.count);
		});
	};

	/**
	 * Get the count of new users for yesterday
	 * @param Function callback(count)
	 */
	this.getNewUsersYesterday = function(callback) {
		var yesterdayStart = new Date();
		yesterdayStart.setDate(yesterdayStart.getDate() - 1);
		yesterdayStart.setHours(0, 0, 0, 0);
		var yesterdayEnd = new Date();
		yesterdayEnd.setHours(0, 0, 0, 0);

		var yesterdayQuery = JSON.stringify({
			timestamp: {
				$gte: yesterdayStart.toISOString(),
				$lt: yesterdayEnd.toISOString()
			}
		});

		app.core.api.get('/metrics/count/m/account.register/' + encodeURIComponent(yesterdayQuery), function(data) {
			callback(data.count);
		});
	};

	/**
	 * Get the count of new users for this month
	 * @param Function callback(count)
	 */
	this.getNewUsersMonth = function(callback) {
		var date = new Date();
		var monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
		var monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

		var monthQuery = JSON.stringify({
			timestamp: {
				$gte: monthStart.toISOString(),
				$lt: monthEnd.toISOString()
			}
		});

		app.core.api.get('/metrics/count/m/account.register/' + encodeURIComponent(monthQuery), function(data) {
			callback(data.count);
		});
	};

	/**
	 * Get the count of logged in users for this month
	 * @param Function callback(count)
	 */
	this.getRecurringUsersMonth = function(callback) {
		var date = new Date();
		var monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
		var monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

		var recurringQuery = JSON.stringify({
			timestamp: {
				$gte: monthStart.toISOString(),
				$lt: monthEnd.toISOString()
			}
		});

		app.core.api.get('/metrics/count/m/account.login/' + encodeURIComponent(recurringQuery), function(data) {
			callback(data.count);
		});
	};

	/**
	 * Get the provider account count of a specific provider
	 * @param String providerName
	 * @param Function callback(count)
	 */
	this.getProviderAccounts = function(providerName, callback) {
		var providerQuery = JSON.stringify({providerName: providerName});

		app.core.api.get('/metrics/count/f/userproviders/' + encodeURIComponent(providerQuery), function(data) {
			callback(data.count);

			if (providerAccountListeners.indexOf(providerName) != -1) {
				collectProviderStats(providerName, data.count);
			}
		});
	};

	/**
	 * Collect the individual provider requests and aggregate them
	 * @param Array providers
	 * @param Function callback(total, providers)
	 */
	this.awaitProviderAccounts = function(providers, callback) {
		providerAccountCallback = callback;
		providerAccountListeners = providers;
	};

	/**
	 * Collect the counts from the provider requests
	 * @param String provider
	 * @param Int count
	 */
	var collectProviderStats = function(provider, count) {
		providerAccountCounts[provider] = count;

		if (Object.keys(providerAccountCounts).length == providerAccountListeners.length) {
			var total = 0;

			for (var i in providerAccountCounts) {
				total += providerAccountCounts[i];
			}

			providerAccountCallback(total, providerAccountCounts);
		}
	};

	/**
	 * Get metrics
	 * @param
	 */
	this.getGraph = function(collection, options, callback) {
		if (!options) var options = {};
		if (!options.interval) options.interval = 1000;
		if (!options.start_time) options.start_time = 0;
		if (!options.end_time) options.end_time = new Date().getTime();

		app.core.api.get('/metrics/' + collection + '?start_time=' + options.start_time + '&end_time=' + options.end_time + '&interval=' + options.interval, function(data) {
			var graphData = [];
			var sum = 0;

			for (var i in data.results) {
				if (options.linear) {
					sum += data.results[i].value;

					graphData.push({
						x: parseInt(i),
						y: sum
					});
				} else {
					graphData.push({
						x: parseInt(i),
						y: data.results[i].value
					});
				}
			}

			callback(graphData);
		});
	};
};
