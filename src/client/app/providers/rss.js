app.lib.providers.add('rss', function(provider, data) {
	provider.icon = app.config.providers.rss.icon;
	provider.formattedName = app.config.providers.rss.formattedName;
	provider.providerName = 'rss';
	provider.comments = {};
	provider.isExpandable = false;
	provider.canPost = false;
	provider.conversationType = 'none';
	provider.shouldShowName = false;
	provider.shouldFormatMessage = false;

	if (data) {
		provider.formattedName = data.provider.username;
		provider.name = data.provider.username;
	}

	/**
	 * List of actions and their UI data
	 */
    provider.actions.list = [];

	/**
	 * Show the OAuth popup
	 */
	provider.authorize.popup = function() {
		var $icon, $field, $results, selected, $nameField, $nameFieldInput;

		/**
		 * Search for feeds
		 * @param String query
		 */
		var search = function(query) {
			if (!query) {
				selected = false;
				return $results.hide().html('');
			}
			
			// Loading icon
			$icon.removeClass('fa-search').addClass('fa-refresh').addClass('fa-spin');

			// Request the content
			$.getJSON('/rss?query=' + query + '&count=5', function(result) {
				$icon.addClass('fa-search').removeClass('fa-refresh').removeClass('fa-spin');

				if (result && result.results && result.results.length) {
					result.results[0].first = true;
					
					selectFeed({
						rss_url: result.results[0].feedId,
						rss_name: result.results[0].title,
						rss_favicon: result.results[0].visualUrl
					});

					$results.show();

					app.core.view.render('modals/rss-result', result, '#rss-search-results', function() {
						$('#rss-search-results a').on('click', function() {
							$('#rss-search-results .selected').removeClass('selected');

							$this = $(this);

							$this.addClass('selected');

							selectFeed({
								rss_url: $this.attr('data-feed'),
								rss_name: $this.children('h3').text(),
								rss_favicon: $this.children('img').attr('src')
							});
						});
					});
				} else {
					selected = false;

					$results.hide().html('');
				}
			});
		};

		var suggestions = new app.helpers.liveSuggestions(1000, search);

		/** 
		 * Store a feed URL as selected, in case the user submits the form
		 * @param String feedURL
		 */
		var selectFeed = function(feedURL) {
			feedURL.rss_url = feedURL.rss_url.replace(/^feed\//, '');
			
			if (feedURL.rss_name) {
				feedURL.rss_name = formatFeedName(feedURL.rss_name);
			}

			selected = feedURL;
		};

		/** 
		 * Format feed name
		 * @param String name
		 * @return String
		 */
		var formatFeedName = function(name) {
			if (name.length > 20) {
				name = name.substr(0, 17) + '...';
			}

			return name;
		};

		/**
		 * Initialize the UI
		 */
		var manageUI = function() {
			$icon = $('#rss-search-icon');
			$field = $('#rss-feed-search');
			$results = $('#rss-search-results');
			$nameField = $('#rss-name-field');
			$nameFieldInput = $('#rss-name-field-input');

			$field.focus();

			$field.on('keydown', function() {
				var query = $field.val();

				if (/^https?:\/\//.test(query)) {
					selectFeed({ rss_url: query });
					$results.hide().html('');

					$nameField.addClass('visible');
					return;
				}

				$nameField.removeClass('visible');
				
				suggestions.search(query);
			});

			// Pasted?
			$field.on('keyup', function() {
				var query = $field.val();

				if (/^https?:\/\//.test(query)) {
					selectFeed({ rss_url: query });
					$results.hide().html('');

					$nameField.addClass('visible');
					return;
				}
			});

			$('#add-rss-button').on('click', function() {
				if (!selected || !selected.rss_url) return;

				if (!selected.rss_name && $nameField.hasClass('visible') && $nameFieldInput.val()) {
					selected.rss_name = formatFeedName($nameFieldInput.val());
				}

				app.lib.ui.modal.hide();

				app.controller.injectProviderData('rss', selected);
			});
		};

		app.lib.ui.modal.show('modals/add-rss', false, false, manageUI);
	};

	/**
	 * Call the OAuth callback
	 * @param Object data
	 * @param Function callback
	 */
	provider.authorize.callback = function(data, callback) {
		app.lib.ui.loader.show();
		app.core.api.post('/provider/rss/callback', data, callback);
	};

	/**
	 * Get the time for the last post, formatted appropriately for "get older feed"
	 * @param return Int
	 */
	provider.getLoadMoreParameter = function() {
		//var pagination_id = provider.posts[provider.posts.length - 1].pagination_id;
		//return pagination_id;
	};

	return provider;
});
