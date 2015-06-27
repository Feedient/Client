app.lib.providers.add('facebook', function(provider, data) {
	provider.icon = app.config.providers.facebook.icon;
	provider.formattedName = app.config.providers.facebook.formattedName;
	provider.providerName = 'facebook';
	provider.hasNotifications = true;
	provider.openNotificationsExternally = true;

	if (data) {
		provider.name = data.provider.full_name;
		provider.profile_link = 'https://facebook.com/' + provider.userId;
	}

	/**
	 * List of actions and their UI data
	 */
	provider.actions.list = [
		{
			text: {
				normal: app.core.i18n.get('facebook:like'),
				performed: app.core.i18n.get('facebook:liked')
			},
			icon: 'fa fa-thumbs-up',
			method: 'like',
			performed_key: 'liked'
		},

		{
			text: {
				normal: app.core.i18n.get('facebook:comments'),
				performed: false
			},
			icon: 'fa fa-comments',
			method: 'comments',
			performed_key: false
		}
	];

	/**
	 * Show the OAuth popup
	 */
	provider.authorize.popup = function() {
		app.helpers.popup('https://facebook.com/v2.0/dialog/oauth?client_id=' + encodeURIComponent(app.config.providers.facebook.APP_ID) + '&display=popup&scope=read_stream,manage_notifications,publish_actions,publish_stream,user_photos,friends_photos,friends_likes,friends_videos,friends_status,friends_relationship_details,user_photos,manage_pages&redirect_uri=' + encodeURIComponent(window.location.origin + '/app/callback/facebook'));
	};

	/**
	 * Call the OAuth callback
	 * @param Object data
	 * @param Function callback
	 */
	provider.authorize.callback = function(data, callback) {
		app.lib.ui.loader.show();
		app.core.api.post('/provider/facebook/callback', data, callback);
	};

	/**
	 * Get the time for the last post, formatted appropriately for "get older feed"
	 * @param return Int
	 */
	provider.getLoadMoreParameter = function() {
		var timestamp = provider.posts[provider.posts.length - 1].content.date_created;

		return Math.floor(new Date(timestamp).getTime() / 1000);
	};

	/**
	 * Expand the post and show comments
	 * @param String postId
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
				app.lib.ui.columnOverlay.show(provider.id, 'feed/post-comments', {
					provider: provider,
					post: postHTML,
					postData: postData
				}, function(overlayId) {
					provider.getActionCount(postId);
					provider.getComments(postId);
				});
			});
		});
	};

	/**
	 * Like a post
	 * @param String postId
	 * @param Object element
	 * @param Boolean isPushout Is the element argument the like button in the pushout?
	 */
	provider.actions.like = function(postId, element, isPushout) {
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
			$pushoutLikeButton.removeClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Like');
			$likeButton.removeClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Like');
		};

		/**
		 * Change the UI to be "liked"
		 */
		var like = function() {
			$pushoutLikeButton.addClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Liked');
			$likeButton.addClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Liked');
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
			post_id: postId
		}, function(data) {
			if (!data || data.error) {
				app.core.log.error(data);

				provider.posts[index].content.actions_performed.liked = !undo;

				// Revert the UI changes
				if (undo) {
					like();
					app.lib.ui.toast(app.core.i18n.get('toast.undo_like_failed'), 'fa-warning');
				} else {
					unlike();
					app.lib.ui.toast(app.core.i18n.get('toast.like_failed'), 'fa-warning');
				}
			}
		});
	};

	/**
	 * Show the comments
	 * @param String postId
	 * @param Object element
	 * @param Boolean isCommentCount Is the element argument the comment count element?
	 */
	provider.actions.comments = function(postId, element, isCommentCount) {
		var $post = $(element);

		if (isCommentCount) {
			$post = $post.parents('.actions').find('.comment-link');
		}

		provider.actions.show(postId, $post);
	};

	// Prevent double-submissions
	provider.actions.isCommenting = false;

	/**
	 * Submit the comment field
	 * @param String postId
	 * @return Boolean (always false, to prevent form submission)
	 */
	provider.actions.submitComment = function(postId, element) {
		if (!element) var element = 'pushout';

		if (provider.actions.isCommenting) return false;

		var data = {
			post_id: postId,
			comment_message: $('#comment-text-' + provider.id + '-' + postId).val()
		};

		if (!provider.specialCompose.canPost(data.comment_message)) return false;

		provider.actions.isCommenting = true;

		$loading = $('#comment-loading-' + provider.id + '-' + postId);
		$loading.show();

		app.core.api.post('/provider/' + provider.id + '/action/comment', data, function(response) {
			provider.actions.isCommenting = false;

			if (!response || response.error) {
				app.core.log.error(response);
				return;
			}

			$('#comment-text-' + provider.id + '-' + postId).val('');

			var newComment = [
				{
					content: {
						date_created: new Date().toString(),
						message: data.comment_message
					},
					user: {
						id: provider.userId,
						image: 'https://graph.facebook.com/v2.0/' + provider.accountId + '/picture?access_token=' + provider.providerTokens.access_token,
						name: provider.name,
						name_formatted: '',
						profile_link: provider.profile_link
					},
					id: response.id
				}
			];

			app.core.view.render('feed/generic-comments', {
				comments: newComment,
				provider: provider
			}, function(html) {
				$loading.hide();
				$(html).insertAfter($('#' + element + '-comments-' + provider.id + '-' + postId).children('.comment').last());
				$('.more-comments')[0].scrollIntoView();

			});
		});

		return false;
	};

	/**
	 * Show the shares of a post
	 * @param String postId
	 * @param Object element
	 */
	provider.actions.showShares = function(postId, element) {
		app.lib.ui.modal.show('under-development-modal', { feature: 'Users who shared' });
	};

	/**
	 * Show the likes of a post
	 * @param String postId
	 * @param Object element
	 */
	provider.actions.showLikes = function(postId, element) {
		app.lib.ui.modal.show('under-development-modal', { feature: 'Users who liked' });
	};

	return provider;
});
