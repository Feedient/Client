app.lib.providers.add('twitter', function(provider, data) {
	provider.icon = app.config.providers.twitter.icon;
	provider.formattedName = app.config.providers.twitter.formattedName;
	provider.providerName = 'twitter';
	provider.showUsername = true;
	provider.conversationType = 'conversation';
	provider.canPost = true;
	provider.hasNotifications = true;

	if (data) {
		provider.name = data.provider.username;
		provider.profile_link = 'https://twitter.com/' + provider.name;
	}

	// List of actions and their UI data
	provider.actions.list = [
		{
			text: {
				normal: app.core.i18n.get('twitter:reply'),
				performed: false
			},
			icon: 'fa fa-reply',
			method: 'reply',
			performed_key: false
		},
		{
			text: {
				normal: app.core.i18n.get('twitter:favorite'),
				performed: app.core.i18n.get('twitter:favorited')
			},
			icon: 'fa fa-star',
			method: 'favorite',
			performed_key: 'favorited'
		},

		{
			text: {
				normal: app.core.i18n.get('twitter:retweet'),
				performed: app.core.i18n.get('twitter:retweeted')
			},
			icon: 'fa fa-retweet',
			method: 'retweet',
			performed_key: 'retweeted'
		}
	];

	// In-feed actions
	provider.actions.types = {
		retweet: {
			icon: 'fa fa-retweet',
			name: 'retweeted'
		}
	};

	/**
	 * Check if a post exists in the cache (both tweets and retweets)
	 * @param Object post
	 * @return Bool
	 */
	provider.postExists = function(post) {
		if (!post || !provider.posts.length) return;

		for (var i in provider.posts) {
			// PostA's ID equals postB's ID
			if (provider.posts[i].id == post.id) {
				return true;
			// postA's original ID equals postB's ID
			} else if (post.original_id && provider.posts[i].id == post.original_id) {
				return true;
			// postA's ID equals postB's original ID
			} else if (provider.posts[i].original_id && provider.posts[i].original_id == post.id) {
				return true;
			// postA's original ID equals postB's original ID
			} else if (post.original_id && provider.posts[i].original_id && provider.posts[i].original_id == post.original_id) {
				return true;
			}
		}

		return false;
	};

	// Define temporary OAuth tokens
	provider.requestToken = false;
	provider.requestSecret = false;

	/**
	 * Show the OAuth popup
	 */
	provider.authorize.popup = function() {
		var popupWindow = app.helpers.popup(false, false, 530);

		// Obtain the request tokens
		app.core.api.get('/provider/twitter/request_token', function(response) {
			provider.authorize.requestToken = response.oauth_token;
			provider.authorize.requestSecret = response.oauth_secret;

			// Redirect the already opened popup to the authorization URL
			popupWindow.location.href = 'https://api.twitter.com/oauth/authorize?oauth_token=' + provider.authorize.requestToken;
		});
	};

	/**
	 * Call the OAuth callback
	 * @param Object data
	 * @param Function callback
	 */
	provider.authorize.callback = function(data, callback) {
		data.oauth_secret = provider.authorize.requestSecret;
		app.lib.ui.loader.show();
		app.core.api.post('/provider/twitter/callback', data, callback);
	};

	/**
	 * Get the id of the last post to be used in the "get older feed" request
	 * @param return String
	 */
	provider.getLoadMoreParameter = function() {
		return provider.posts[provider.posts.length - 1].id;
	};

	/**
	 * Listens to compose text field to count remaining characters
	 * @param String/Element counterSelector
	 * @param String/Element fieldSelector
	 */
	provider.initMessageLimitations = function(postId) {
		var fieldSelector, $remaining;

		// if no id --> compose
		if(postId) {
			fieldSelector = '#reply-text-' + provider.id + '-' + postId;
			$('#special-compose-area-' + provider.id + '-' + postId).append('<div class="twitter-special-compose" id="twitter-special-compose-' + provider.id + '-' + postId + '">\<i class="fa fa-twitter"></i> <span id="twitter-special-remaining-' + provider.id + '-' + postId + '">140</span>\</div>');
			$remaining = $('#twitter-special-remaining-' + provider.id + '-' + postId);
		} else {
			fieldSelector = '#compose-text';
			$('#special-compose-area').append('<div class="twitter-special-compose" id="twitter-special-compose">\<i class="fa fa-twitter"></i> <span id="twitter-special-remaining">140</span>\</div>');
			$remaining = $('#twitter-special-remaining');
		}

		$(fieldSelector).on('keyup', function() {
			var matches = $(this).val().match(/(https?:\/\/(www\.)?[^\s]+|(www\.)[^\s]+)/g);
			var totalLinkLenghts = 0;
			var httpCount = 0;
			var httpsCount = 0;

			for(var matchIndex in matches) {
				totalLinkLenghts += matches[matchIndex].length;
				if ( matches[matchIndex].indexOf('https') > -1 ) {
					httpsCount += 1;
				} else {
					httpCount += 1;
				}
			}

			var remaining = 140 - $(this).val().length + totalLinkLenghts - (httpCount * 22) - (httpsCount * 23);
			$remaining.html(remaining);

			// UI logic
			if (remaining < 0 && $('#twitter-special-compose').css('display') !== 'none') {
				provider.canPost = false;
				$remaining.css({ color: '#FF0000' });
				$('#compose-submit-button').addClass('button-inactive');
				$('a.button.right').addClass('button-inactive');
			} else {
				provider.canPost = true;
				$remaining.css({ color: '' });
				$('#compose-submit-button').removeClass('button-inactive');
				$('a.button.right').removeClass('button-inactive');
			}
		});
	};

	/**
	 * Initialize the optional special compose field handler,
	 * such as message length counter.
	 * @param Boolean disabled
	 */
	provider.specialCompose.initialize = function(disabled) {
		// Does the character counter HTML already exist?
		if (!$('#twitter-special-compose').length) {
			provider.initMessageLimitations();

			// Is this provider disabled?
			if (disabled) $('#twitter-special-compose').hide();

		// Is this provider enabled and the character counter is hidden?
		} else if(!disabled && $('#twitter-special-compose').css('display') == 'none') {
			$('#twitter-special-compose').show();
		}
	};

	/**
	 * Turn the special compose handler on
	 */
	provider.specialCompose.on = function() {
		$('#twitter-special-compose').show();
	};

	/**
	 * Turn the special compose handler off
	 */
	provider.specialCompose.off = function() {
		$('#twitter-special-compose').hide();
	};

	/**
	 * Validate whether the message may be posted
	 * @param String message
	 * @return Boolean
	 */
	provider.specialCompose.canPost = function(message) {
		if (message == '') return true;
		return provider.canPost;
	};

	/**
	 * Append @username to empty message field
	 * @param Element field
	 * @param String username
	 */
	provider.specialCompose.focusReplyField = function(field, postId) {
		var $field = $(field);
		var mentions = '';
		var currentUser = '@' + provider.name;
		var post = provider.getPost(postId);

		// add poster to mentions if not current user
		if (post.user.name_formatted != currentUser) {
			mentions += post.user.name_formatted + ' ';
		}

		// add mentions from post to next pots's mentions
		// only add when not current user and not poster
		for (var i in post.content.entities.mentions) {
			if (post.content.entities.mentions[i].name != currentUser && post.content.entities.mentions[i].name != post.user.name_formatted) {
				mentions += post.content.entities.mentions[i].name + ' ';
			}
		}

		//if no mentions and no poster was added because it was current user add current user because than it is a reply to his/her own tweet
		if (mentions == '') {
			mentions += post.user.name_formatted + ' ';
		}

		if (!$field.val().length) {
			$field.val(mentions);
		} else if($field.val().length && $field.val() == mentions) {
			$field.val('');
		}

		$field.trigger('keyup');
	};

	/**
	 * Show the conversation pushout
	 * @param String postId
	 * @param String selector
	 * @param String selectorName
	 * @param Boolean noColumn
	 */
	provider.actions.show = function(postId, selector, selectorName, noColumn) {
		app.lib.ui.modal.hide();

		if (app.core.router.active != '/') {
			window.location = '/';
		}
		
		// Open sub-tweets from notification center in actual feed
		if (window.hideNotifications && !noColumn) {
			window.hideNotifications();
		}

		app.core.log.debug('Loading post [' + postId + ']', 'Providers/Twitter');

		provider.getPost(postId, function(postData) {
			app.core.log.debug('Post loaded [' + postId + ']', 'Providers/Twitter');
			if (!postData || postData.error) {
				app.lib.ui.toast(app.core.i18n.get('toast.post_not_found'), 'fa-warning');
				$('#overlays-' + provider.id).html('');
				return;
			}

			var data = {
				posts: [ postData ],
				isConversation: true,
				hideActions: true,
				provider: provider,
				expandText: true
			};

			app.core.view.render('feed/generic', data, function(postHTML) {
				var loadMiscData = function() {
					provider.getActionCount(postId, selectorName);
					provider.getConversation(postId, selectorName);

					// Start the character counter listener
					provider.initMessageLimitations(postId);
				};

				var viewData = {
					provider: provider,
					post: postHTML,
					postData: postData,
					noColumn: noColumn
				};

				if (selector) {
					viewData.elementId = selectorName;
					app.core.view.render('feed/post-conversation', viewData, selector, loadMiscData)
				} else {
					app.lib.ui.columnOverlay.show(provider.id, 'feed/post-conversation', viewData, loadMiscData);
				}
			});
		});
	};

	/**
	 * Favorite a tweet
	 * @param String postId
	 * @param Object element
	 * @param Boolean isPushout Is the element argument the like button in the pushout?
	 */
	provider.actions.favorite = function(postId, element, isPushout) {
		var $post;
		var undo = false;
		var $favoriteButton;
		var $pushoutFavoriteButton = $('#pushout-' + provider.id + '-' + postId + ' .favorite-button');

		if (isPushout) {
			$post = $('#post-' + provider.id + '-' + postId);
		} else {
			$post = $(element).parents('.post');
		}

		$favoriteButton = $post.find('.favorite-link');

		/**
		 * Change the UI to be "unfavorited"
		 * @param Boolean both
		 */
		var unfavorite = function(both) {
			$pushoutFavoriteButton.removeClass('color-favorited').html('<i class="fa fa-star"></i> Favorite');
			$favoriteButton.removeClass('color-favorited').html('<i class="fa fa-star"></i> Favorite');
		};

		/**
		 * Change the UI to be "favorited"
		 * @param Boolean both
		 */
		var favorite = function(both) {
			$pushoutFavoriteButton.addClass('color-favorited').html('<i class="fa fa-star"></i> Favorited');
			$favoriteButton.addClass('color-favorited').html('<i class="fa fa-star"></i> Favorited');
		};

		// Get the array index of the post, false means it's not in the feed
		var index = provider.getPostIndex(postId);

		provider.getPost(postId, function(post) {
			var undo = post.content.actions_performed.favorited;

			if (undo) {
				unfavorite();
			} else {
				favorite();
			}

			// If the post is in the feed, we should keep track of the state to avoid UI becoming out of sync
			if (index) {
				provider.posts[index].content.actions_performed.favorited = !undo;
			}

			var action = undo ? 'unfavorite' : 'favorite';

			app.core.api.post('/provider/' + provider.id + '/action/' + action, {
				tweet_id: postId
			}, function(data) {
				if (!data || data.error) {
					app.core.log.error(data);

					if (index) {
						provider.posts[index].content.actions_performed.favorited = !undo;
					}

					// Revert the UI changes
					if (undo) {
						favorite();
						app.lib.ui.toast(app.core.i18n.get('toast.undo_favorite_failed'), 'fa-warning');
					} else {
						unfavorite();
						app.lib.ui.toast(app.core.i18n.get('toast.favorite_failed'), 'fa-warning');
					}
				}
			});
		});
	};

	/**
	 * Show the reply pushout
	 * @param String postId
	 * @param Object element
	 */
	provider.actions.reply = function(postId) {
		provider.actions.show(postId);
	};

	// Prevent double-submissions
	provider.actions.isReplying = false;

	/**
	 * Submit the reply field
	 * @param String postId
	 * @return Boolean (always false, to prevent form submission)
	 */
	provider.actions.submitReply = function(postId) {
		if (provider.actions.isReplying) return false;

		app.lib.ui.modal.hide();

		if (!provider.canPost) return false;

		var data = {
			tweet_id: postId,
			tweet_reply_msg: $('#reply-text-' + provider.id + '-' + postId).val()
		};

		provider.actions.isReplying = true;

		$loading = $('#reply-loading-' + provider.id + '-' + postId);
		$loading.show();

		app.core.api.post('/provider/' + provider.id + '/action/reply', data, function(response) {
			provider.actions.isReplying = false;
			$loading.hide();

			if (!response || response.error) {
				app.core.log.error(response);
			} else {
				$('#reply-text-' + provider.id + '-' + postId).val('');
				// Close ALL overlays
				app.lib.ui.columnOverlay.hideAll(provider.id);

				// Fake a post
				var posts = [{
					id: response.data,
					post_link: provider.profile_link,

					content: {
						action: { type: null, user: null },
						action_counts: { },
						actions_performed: { },
						date_created: new Date().toString(),
						entities: {
							extended_link: null,
							hashtags: [],
							links: [],
							mentions: [],
							pictures: [],
							videos: []
						},
						is_conversation: true,
						message: data.tweet_reply_msg,
						title: null
					},
					twitter: {
						in_reply_to_status_id_str: postId
					},
					user: {
						id: provider.accountId,
						image: '/app/images/avatar-load.gif',
						name: (provider.hasNameAvailable) ? provider.name : '',
						name_formatted: (provider.showUsername) ? '@' + provider.userId : null,
						profile_link: provider.profile_link
					}
				}];

				app.lib.stream.inject(provider.id, posts);

				// Catch the post as it arrives
				app.lib.stream.await(provider.id, response.data, function(postData) {
					var $post = $('#post-' + provider.id + '-' + response.data);
					$post.find('.avatar img').first().attr('src', postData.user.image);

					// "real name" wasn't available
					if (!posts[0].user.name || posts[0].user.name == posts[0].user.name_formatted) {
						$post.find('.real-name').first().html(postData.user.name);
					}

					// Correct the post link
					$post.find('.time').first().attr('href', postData.post_link);

					// Format the message
					var $message = $post.find('.message').first();
					$message.html(app.helpers.formatMessage(postData.content.message, postData.content.entities, provider.id, response.data));

					var index = provider.getPostIndex(response.data);
					if (!index) return;

					provider.posts[index] = postData;
				});
			}
		});

		return false;
	};

	/**
	 * We need to keep these arguments in memory between
	 * retweet(...) and the doRetweet() methods, since the
	 * retweet(...) method only opens a confirmation modal
	 * and doesn't actually send the data to the API server
	 */
	provider.actions.postId = false;
	provider.actions.element = false;
	provider.actions.isPushout = false;

	/**
	 * Prompt the user to retweet a tweet
	 * @param String postId
	 * @param Object element
	 * @param Boolean isPushout
	 */
	provider.actions.retweet = function(postId, element, isPushout) {
		provider.actions.postId = postId;
		provider.actions.element = element;
		provider.actions.isPushout = isPushout;

		var post = provider.getPost(postId);

		// Unretweet immediately
		if (post.content.actions_performed.retweeted) {
			provider.actions.doRetweet();
			return;
		}

		app.lib.ui.modal.show('modals/confirm-retweet', { providerId: provider.id });
	};

	/**
	 * Confirm the retweet action and actually perform it
	 */
	provider.actions.doRetweet = function() {
		app.lib.ui.modal.hide();

		// Retrieve arguments
		var postId = provider.actions.postId;
		var element = provider.actions.element;
		var isPushout = provider.actions.isPushout;

		var $post;
		var undo = false;
		var $retweetButton;
		var $pushoutRetweetButton = $('#pushout-' + provider.id + '-' + postId + ' .retweet-button');

		if (isPushout) {
			$post = $('#post-' + provider.id + '-' + postId);
		} else {
			$post = $(element).parents('.post');
		}

		$retweetButton = $post.find('.retweet-link');

		/**
		 * Change the UI to be "unretweeted"
		 * @param Boolean both
		 */
		var unretweet = function(both) {
			$pushoutRetweetButton.removeClass('color-retweeted').html('<i class="fa fa-retweet"></i> Retweet');
			$retweetButton.removeClass('color-retweeted').html('<i class="fa fa-retweet"></i> Retweet');
		};

		/**
		 * Change the UI to be "retweeted"
		 * @param Boolean both
		 */
		var retweet = function(both) {
			$pushoutRetweetButton.addClass('color-retweeted').html('<i class="fa fa-retweet"></i> Retweeted');
			$retweetButton.addClass('color-retweeted').html('<i class="fa fa-retweet"></i> Retweeted');
		};

		var index = provider.getPostIndex(postId);

		provider.getPost(postId, function(post) {
			var undo = post.content.actions_performed.retweeted;

			if (undo) {
				unretweet();
			} else {
				retweet();
			}

			if (index) {
				provider.posts[index].content.actions_performed.retweeted = !undo;
			}

			var action = undo ? 'delete_retweet' : 'retweet';

			app.core.api.post('/provider/' + provider.id + '/action/' + action, {
				tweet_id: postId
			}, function(data) {
				if (!data || data.error) {
					app.core.log.error(data);

					if (index) {
						provider.posts[index].content.actions_performed.retweeted = !undo;
					}

					// Revert the UI changes
					if (undo) {
						retweet();
						app.lib.ui.toast(app.core.i18n.get('toast.undo_retweet_failed'), 'fa-warning');
					} else {
						unretweet();
						app.lib.ui.toast(app.core.i18n.get('toast.retweet_failed'), 'fa-warning');
					}
				}
			});
		});
	};

	return provider;
});
