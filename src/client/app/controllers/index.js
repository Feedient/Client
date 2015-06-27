app.core.router.get('/', function() {
	/**
	 * Never show social announcement again
	 */
	this.closeSocialAnnouncement = function(element) {
		var $announcement = $(element).parents('.announcement');

		$announcement.removeClass('announcement-visible')
		$('#main').removeClass('announcement-visible');
		
		setTimeout(function() { $announcement.remove(); }, 300);

		$.cookie('seen_social', '2', { expires: 365, path: '/' });
	};

	/**
	 * Load and display the social announcement
	 */
	var loadSocialAnnouncement = function() {
		// First visit, don't display it
		if (!$.cookie('seen_social')) {
			$.cookie('seen_social', '1', { expires: 365, path: '/' });
			return;
		}

		// Don't display it if the user has dismissed it
		if ($.cookie('seen_social') == '2') return;

		app.core.view.render('feed/social-announcement', false, function(HTML) {
			setTimeout(function() {
				var $announcement = $(HTML);
				var $main = $('#main');

				$main.before($announcement);
				$announcement.addClass('announcement-visible');
				$main.addClass('announcement-visible');

				app.core.hooks.on('route', function(data, next) {
					if (data.route != '/') {
						$announcement.removeClass('announcement-visible')
						$main.removeClass('announcement-visible');

						setTimeout(function() { $announcement.remove(); }, 300);
					}

					next(data);
				});
			}, 3000);
		});
	};

	app.lib.ui.loader.show();

	app.lib.user.getProviders(function(providers) {
		if (!providers.length) {
			window.location = './settings';
			return;
		}

		var data = {
			providers: providers
		};

		/**
		 * Handle realtime events
		 * @param Array provider
		 * @param Array posts
		 */
		var streamHandler = function(provider, posts) {
			var $posts = $('#posts-' + provider.id);

			var data = {
				provider: provider,
				posts: posts,
				animated: $posts.scrollTop() == 0
			};

			app.core.view.render('feed/generic', data, function(html) {
				$posts.prepend(html);
				app.helpers.timeAgo('#posts-' + provider.id);

				if (data.animated) {
					// Remove animation class after 500ms to prevent it from run again on rearrangements
					setTimeout(function() { $('.animated-post').removeClass('animated-post'); }, 500);
				} else {
					app.helpers.scrollCompensate($posts, $posts.children().first());
				}
			});
		};

		/**
		 * Load more posts upon scroll-triggered event
		 * @param String providerId
		 * @param Function resetCallback
		 */
		var loadMoreHandler = function(provider, resetCallback) {
			if ($('#loader-' + provider.id + '-more').length) return;

			$('#posts-' + provider.id).append('<div class="inline-loading" id="loader-' + provider.id + '-more"></div>');

			provider.getOlderFeed(function(response) {
				$('#loader-' + provider.id + '-more').remove();

				// Append the posts etc
				app.core.view.render('feed/generic', { provider: provider, posts: response }, function(html) {
					$('#posts-' + provider.id).append(html);
					app.helpers.timeAgo('#posts-' + provider.id);

					if (response && !response.error && response.length) {
						// Make it possible for the event to be triggered again
						resetCallback();
					}
				});
			});
		};

		/**
		 * Loop through each user provider and display it
		 * @param Array provider
		 */
		var providerIterator = function(provider) {
			provider.getFeed(function(response) {
				if (response && response.error) {
					if (response.error.code == 1003) {
						return app.core.view.render('feed/api-limit-error', { provider: provider }, '#posts-' + provider.id);
					}

					return app.core.view.render('feed/feed-error', { error: response.error }, '#posts-' + provider.id);
				}

				// Add stream for this provider
				app.lib.stream.open(provider, streamHandler);

				// Show our view
				app.core.view.render('feed/generic', { provider: provider, posts: response }, '#posts-' + provider.id, function(postsElement) {
					app.helpers.timeAgo(postsElement);
					app.helpers.scrollWatch(provider, 1000, loadMoreHandler);

					var $element = $('#posts-' + provider.id);
					var $scrollOverlay = $element.prev('.scroll-overlay');
					var $elementTitle = $scrollOverlay.prev('h1');


					$scrollOverlay.on('click', function() {
						$element[0].scrollTop = 0;
					});

					var onTop = false;

					$element.on('scroll', function() {
						if ($element.scrollTop() && !onTop) {
							$scrollOverlay.css({ opacity: 0 }).show().animate({ opacity: 1 }, 300);
							onTop = true;
						} else if (!$element.scrollTop() && onTop) {
							$scrollOverlay.hide();
							onTop = false;
						}
					});
				});
			});
		};

		/**
		 * Load the providers
		 */
		var loadProviders = function() {
			app.lib.ui.loader.hide();

			// Init the re-ordering
			app.helpers.draggable(function(providerOrder) {
				app.core.api.put('/providers/order', { providerOrder: JSON.stringify(providerOrder) });
				app.lib.user.setProviderOrder(providerOrder);
			});

			// Init key navigation
			app.helpers.feedNavigation({
				select: function($post) {
					$post.addClass('active-post');
					$('.posts').hide().show();
				},

				deselect: function($post) {
					$post.removeClass('active-post');
					$('.posts').hide().show();
				},

				enter: function(provider, postId) {
					provider.actions.show(postId);
				},

				back: function(overlayId) {
					app.lib.ui.columnOverlay.hide(overlayId);
				}
			});

			// Load the providerIterator
			providers.forEach(providerIterator);
		};

		app.core.view.render('feed/index', data, '#main', function() {
			loadSocialAnnouncement();
			loadProviders();
		});
	});
});
