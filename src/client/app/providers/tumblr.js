app.lib.providers.add('tumblr', function(provider, data) {
	provider.icon = app.config.providers.tumblr.icon;
	provider.formattedName = app.config.providers.tumblr.formattedName;
	provider.providerName = 'tumblr';
	provider.showUsername = true;
	provider.canPostWithPicture = false;
	provider.conversationType = 'none';

	if (data) {
		provider.name = data.provider.username;
		provider.profile_link = 'https://' + provider.name + '.tumblr.com/';
	}

	// Define temporary OAuth tokens
	provider.requestToken = false;
	provider.requestSecret = false;

    /**
     * List of actions and their UI data
     */
    provider.actions.list = [
        {
            text: {
                normal: app.core.i18n.get('tumblr:like'),
                performed: app.core.i18n.get('tumblr:liked')
            },
            icon: 'fa fa-heart',
            method: 'like',
            performed_key: 'liked'
        },

        {
            text: {
                normal: app.core.i18n.get('tumblr:reblog'),
                performed: app.core.i18n.get('tumblr:reblogged')
            },
            icon: 'fa fa-retweet',
            method: 'reblog',
            performed_key: 'reblogged'
        }
    ];

	/**
	 * This is to provide contect info when , in this case, someone reblogged something
	 * the result is that the context will use the icon and name to display the context of the post
	 */
	provider.actions.types = {
		reblogged: {
			icon: 'fa fa-retweet',
			name: 'reblogged'
		}
	};

	/**
	 * Show the OAuth popup
	 */
	provider.authorize.popup = function() {
		var popupWindow = app.helpers.popup(false, false, 530);

		// Obtain the request tokens
		app.core.api.get('/provider/tumblr/request_token', function(response) {
			provider.authorize.requestToken = response.oauth_token;
			provider.authorize.requestSecret = response.oauth_secret;

			// Redirect the already opened popup to the authorization URL
			popupWindow.location.href = 'http://www.tumblr.com/oauth/authorize?oauth_token=' + provider.authorize.requestToken;
		});
	};

	/**
	 * Call the OAuth callback
	 */
	provider.authorize.callback = function(data, callback) {
		data.oauth_secret = provider.authorize.requestSecret;
		app.lib.ui.loader.show();
		app.core.api.post('/provider/tumblr/callback', data, callback);
	};

	/**
	 * Get the amount of posts loaded
	 */
	provider.getLoadMoreParameter = function() {
		return provider.posts.length;
	};

    /**
     * Expand the post and show comments
     */
    provider.actions.show = function(postId) {
        app.lib.ui.modal.hide();

		provider.getPost(postId, function(postData) {
			if (!postData || postData.error) {
				app.lib.ui.toast(app.core.i18n.get('toast.post_not_found'), 'fa-warning');
				$('#overlays-' + provider.id).html('');
				return;
			}

			var data = {
				posts: [ postData ],
				hideActions: true,
				provider: provider,
				expandText: true
			};

			app.core.view.render('feed/generic', data, function(postHTML) {
				app.lib.ui.columnOverlay.show(provider.id, 'feed/post-notes', {
					provider: provider,
					post: postHTML,
					postData: postData
				}, function(overlayId) {
					// notes would be called here
				});
			});
		});
    };

	provider.actions.like = function(postId, reblog_key, element, isPushout) {
		var $post;
		var undo = false;
		var index = provider.getPostIndex(postId);
		var $likeButton;
		var $pushoutLikeButton = $('#pushout-' + provider.id + '-' + postId + ' .like-button');

		if (isPushout) {
			$post = $('#post-' + provider.id + '-' + postId);
		} else {
			$post = $(element).parents('.post');
		}

		$likeButton = $post.find('.like-link');

		/**
		 * Change the UI to be "unliked"
		 */
		var unlike = function() {
			$pushoutLikeButton.removeClass('color-liked').html('<i class="fa fa-heart"></i> Like');
			$likeButton.removeClass('color-liked').html('<i class="fa fa-heart"></i> Like');
		};

		/**
		 * Change the UI to be "liked"
		 */
		var like = function() {
			$pushoutLikeButton.addClass('color-liked').html('<i class="fa fa-heart"></i> Liked');
			$likeButton.addClass('color-liked').html('<i class="fa fa-heart"></i> Liked');
		};

		var undo = provider.posts[index].content.actions_performed.liked;

		if (undo) {
			unlike();
		} else {
			like();
		}

		provider.posts[index].content.actions_performed.liked = !undo;

		var action = undo ? 'unlike' : 'like';

		app.core.api.post('/provider/' + provider.id + '/action/' + action, {
			media_id: postId,
			reblog_key: reblog_key
		}, function(data) {
			if (!data || data.error) {
				app.core.log.error(data);

				provider.posts[index].content.actions_performed.liked = !undo;

				// Revert the UI changes
				if (undo) {
					like();
					app.lib.ui.toast('Failed to undo like', 'fa-warning');
				} else {
					unlike();
					app.lib.ui.toast('Failed to like', 'fa-warning');
				}
			}
		});
	};

	provider.actions.reblog = function(postId, reblog_key, element, isPushout) {
		app.core.api.post('/provider/' + provider.id + '/action/reblog', {
			media_id: postId,
			reblog_key: reblog_key
		}, function(data) {
			// set action to fix when succesfull reblog
			var $post = $(element).parents('.post');
			$reblogButton = $post.find('.reblog-link');
			$reblogButton.addClass('color-reblogged').html('<i class="fa fa-retweet"></i> Reblogged');

			if (!data || data.error) {
				app.core.log.error(data);
				app.lib.ui.toast(app.core.i18n.get('toast.reblog_failed'), 'fa-warning');
			}
		});
	};
	return provider;
});
