(function() {

/**
 * Update the count of unread notifications in the menu
 * @param Object data
 */
var updateUnreadCount = function(data) {
	var unreadTotal = 0;

	for (var i in data) {
		unreadTotal += data[i].unreadCount;
	}

	$('#notification-number').html(unreadTotal);

	if (unreadTotal) {
		$('#notifications-link').removeClass('no-notifications');
	} else {
		$('#notifications-link').addClass('no-notifications');
	}
};

/**
 * Wait until all providers have finished loading their notifications
 * @param Function callback
 */
var awaitAllProviderNotifications = function(callback) {
	// Load all providers
	app.lib.user.getProviders(function(providers) {
		var notificationObtainers = [];

		// Queue up a "get notifications" request
		providers.forEach(function(provider) {
			if (!provider.hasNotifications) return;

			// If the initialization of notification loader hasn't been started...
			if (!provider.notificationsStarted) {
				// ...start it
				provider.getNotifications();
			}
			
			// Queue up a notifications listener
			notificationObtainers.push(provider.awaitNotifications);
		});

		// Run them all in parallel
		async.parallel(notificationObtainers, function(err, results) {
			callback(results);
		});
	});
};

/**
 * Preload notifications to show unread count in the menu
 * @param Object data
 * @param Function next
 */
app.core.hooks.on('ready', function(data, next) {
	// Don't block when it's not necessary
	next();

	// Wait until all providers have loaded their notifications
	awaitAllProviderNotifications(updateUnreadCount);
});

app.controllers.notifications = function() {
	var $element, $elementContent;

	/**
	 * Get the notifications
	 */
	var getNotifications = function() {
		// Get the currently active menu link
		var $active = $('.active').first();
		var activeId = $active.attr('id');

		// Remove the active state
		$active.removeClass('active');

		// Make menu link active
		var $link = $('#notifications-link');
		if (activeId) $link.attr('data-active-link', activeId);
		$link.addClass('active');

		// Show the notifications pushout
		$element.show().addClass('visible');
		$element.on('click', window.hideNotifications);

		// Get notifications
		awaitAllProviderNotifications(function(data) {
			var viewData = {
				notifications: []
			};

			// Loop through all provider notificiaton data
			data.forEach(function(providerData) {
				var providerObject = app.lib.user.getProvider(providerData.id);

				// Mark all as read
				providerObject.markNotificationsAsRead();

				var provider = {
					providerName: providerObject.providerName,
					icon: providerObject.icon,
					name: providerObject.name,
					id: providerData.id,
					openExternal: providerObject.openNotificationsExternally
				};

				// Add all notifications to the viewData
				for (var i in providerData.notifications) {
					providerData.notifications[i].provider = provider;
					viewData.notifications.push(providerData.notifications[i]);
				}
			});

			// Sort by timestamp
			viewData.notifications.sort(function(a, b) {
				return new Date(b.created_time).getTime() - new Date(a.created_time).getTime();
			});

			$('#notification-number').html('0');
			$('#notifications-link').addClass('no-notifications');

			// Render the view
			app.core.view.render('pages/notifications-list', viewData, '#notifications-pushout-content', function() {
				$elementContent.find('a.post').on('click', function() {
					var $activeNotificationsPost = $('.active-notifications-post');

					// Is it the current post? Hide it
					if ($activeNotificationsPost.length && $activeNotificationsPost[0] == this) {
						$activeNotificationsPost.removeClass('active-notifications-post');

						$('#notifications-pushout-post').removeClass('visible');
						$('#notifications-pushout-post-content').html('<div class="inline-loading"></div>');

						return;
					}

					$activeNotificationsPost.removeClass('active-notifications-post');
					$(this).addClass('active-notifications-post');

					var providerId = $(this).attr('data-provider');
					var postId = $(this).attr('data-id');
					
					showPost(providerId, postId);
				});
			});
		});
	};

	/**
	 * Show a post
	 * @param String providerId
	 * @param String postId
	 */
	var showPost = function(providerId, postId) {		
		var provider = app.lib.user.getProvider(providerId);

		if (!provider) return;

		var postData = {
			provider: provider
		};

		$('#notifications-pushout-post').addClass('visible');

		app.core.view.render('pages/notifications-post', postData, '#notifications-pushout-post', function() {
			provider.actions.show(postId, '#notifications-pushout-post-content', 'notifications', true);
		});
	};

	/**
	 * Hide the notifications, provided that the user
	 * clicked outside of the notification column
	 * @param Event e
	 */
	window.hideNotifications = function(e) {
		if (e && (!e.target || e.target.id != 'notifications')) return;

		// Reset menu active state
		var $link = $('#notifications-link');
		var id = $link.attr('data-active-link');

		if (!id) return;

		$element.removeClass('visible').hide();
		$link.removeClass('active');
		$('#notifications-pushout-post').removeClass('visible');
		$('#notifications-pushout-post-content').html('');

		if (id) $('#' + id).addClass('active');
	};

	// Does the element exist?
	if ($('#notifications').length) {
		// Save references to elements
		$element = $('#notifications');
		$elementContent = $('#notifications-pushout-content');

		// Hide the element if it's visible
		if ($element.hasClass('visible')) {
			$element.removeClass('visible').hide();

			// Reset menu active state
			var $link = $('#notifications-link');
			var id = $link.attr('data-active-link');
			$link.removeClass('active');
			if (id) $('#' + id).addClass('active');

			return;
		}
		
		// Show loading spinner and start loading notifications
		$elementContent.html('<div class="inline-loading"></div>');
		getNotifications();
		return;
	}

	// Hide all notification alerts
	$('#notification-alerts').html('');

	// Render the view on the side of the current page
	app.core.view.render('pages/notifications', false, function(HTML) {
		$('#main').prepend(HTML);
		$element = $('#notifications');
		$elementContent = $('#notifications-pushout-content');

		// We need to wait for the element to be rendered, otherwise we won't see the animation
		setTimeout(getNotifications, 50);
	});
};

}());