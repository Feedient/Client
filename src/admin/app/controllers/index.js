app.core.router.get('/', function() {
	// Render the layout
	app.core.view.render('index');

	// Online users
	app.lib.metrics.getUsersOnline(function(count) {
		$('#online-count').html(count);
	});

	// Total user base
	app.lib.metrics.getTotalUsers(function(count) {
		$('#account-stats-total').html(app.helpers.formatNumber(count));
	});

	// Total Logged In Users last month
	app.lib.metrics.getRecurringLastMonth(function(count) {
		$('#account-stats-recurring-last-month').html(app.helpers.formatNumber(count));
	});

	// Conversion visitors --> Registered
	//app.lib.metrics.getNewUsersYesterday(function(count) {
		//$('#account-stats-conversion').html(app.helpers.formatNumber(count));
		$('#account-stats-conversion').html("0");
	//});

	// Recurring users this month
	app.lib.metrics.getRecurringUsersMonth(function(count) {
		$('#account-stats-recurring-month').html(app.helpers.formatNumber(count));
	});

	// New users today
	app.lib.metrics.getNewUsersToday(function(count) {
		$('#account-stats-today').html(app.helpers.formatNumber(count));
	});

	// New users yesterday
	app.lib.metrics.getNewUsersYesterday(function(count) {
		$('#account-stats-yesterday').html(app.helpers.formatNumber(count));
	});

	// New users this month
	app.lib.metrics.getNewUsersMonth(function(count) {
		$('#account-stats-month').html(app.helpers.formatNumber(count));
	});

	// Get total count and shares
	app.lib.metrics.awaitProviderAccounts(['facebook', 'twitter', 'instagram', 'youtube', 'tumblr'], function(total, providers) {
		var facebookPercentage = parseFloat(((providers.facebook / total) * 100).toFixed(1));
		var twitterPercentage = parseFloat(((providers.twitter / total) * 100).toFixed(1));
		var instagramPercentage = parseFloat(((providers.instagram / total) * 100).toFixed(1));
		var tumblrPercentage = parseFloat(((providers.tumblr / total) * 100).toFixed(1));
		var youtubePercentage = 100-(facebookPercentage+twitterPercentage+instagramPercentage+tumblrPercentage);

		$('#facebook-part').animate({ width: facebookPercentage + '%' }).html('<i class="fa fa-facebook-square"></i> ' + facebookPercentage + '%');
		$('#twitter-part').animate({ width: twitterPercentage + '%' }).html('<i class="fa fa-twitter"></i> ' + twitterPercentage + '%');
		$('#instagram-part').animate({ width: instagramPercentage + '%' }).html('<i class="fa fa-instagram"></i> ' + instagramPercentage + '%');
		$('#tumblr-part').animate({ width: tumblrPercentage + '%' }).html('<i class="fa fa-tumblr"></i> ' + tumblrPercentage + '%');
		$('#youtube-part').animate({ width: youtubePercentage + '%' }).html('<i class="fa fa-youtube-play"></i> ' + youtubePercentage.toFixed(1) + '%');
	});

	// Facebook accounts
	app.lib.metrics.getProviderAccounts('facebook', function(count) {
		$('#provider-stats-facebook').html('<i class="fa fa-facebook-square"></i> ' + app.helpers.formatNumber(count));
	});

	// Twitter accounts
	app.lib.metrics.getProviderAccounts('twitter', function(count) {
		$('#provider-stats-twitter').html('<i class="fa fa-twitter"></i> ' + app.helpers.formatNumber(count));
	});

	// Instagram accounts
	app.lib.metrics.getProviderAccounts('instagram', function(count) {
		$('#provider-stats-instagram').html('<i class="fa fa-instagram"></i> ' + app.helpers.formatNumber(count));
	});

	// YouTube accounts
	app.lib.metrics.getProviderAccounts('youtube', function(count) {
		$('#provider-stats-youtube').html('<i class="fa fa-youtube-play"></i> ' + app.helpers.formatNumber(count));
	});

	// Tumblr accounts
	app.lib.metrics.getProviderAccounts('tumblr', function(count) {
		$('#provider-stats-tumblr').html('<i class="fa fa-tumblr-square"></i> ' + app.helpers.formatNumber(count));
	});

	// User graph
	app.lib.metrics.getGraph('account.register', { interval: 60*60, linear: true }, function(graphData) {
		var graph = new Rickshaw.Graph({
			element: document.getElementById("account-graph"),
			width: 958,
			height: 350,
			renderer: 'area',
			series: [
				{
					color: "#1ead91",
					data: graphData,
					name: 'User accounts'
				}
			]
		});

		graph.render();

		var hoverDetail = new Rickshaw.Graph.HoverDetail({
			graph: graph
		});
	});
});
