app.lib.providers.add('instagram', function(provider, data) {
	provider.icon = app.config.providers.instagram.icon;
	provider.formattedName = app.config.providers.instagram.formattedName;
	provider.providerName = 'instagram';
	provider.comments = {};
	provider.canPost = false;

	if (data) {
		provider.name = data.provider.username;
	}

    /**
	 * List of actions and their UI data
	 */
	provider.actions.list = [
		{
			text: {
				normal: app.core.i18n.get('instagram:like'),
				performed: app.core.i18n.get('instagram:liked')
			},
			icon: 'fa fa-heart',
			method: 'like',
			performed_key: 'liked'
		},

		{
			text: {
				normal: app.core.i18n.get('instagram:comments'),
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
		app.helpers.popup('https://api.instagram.com/oauth/authorize?client_id=' + encodeURIComponent(app.config.providers.instagram.APP_ID) + '&response_type=code&scope=basic+comments+relationships+likes&redirect_uri=' + encodeURIComponent(window.location.origin + '/app/callback/instagram'), 670, 610);
	};

	/**
	 * Call the OAuth callback
	 * @param Object data
	 * @param Function callback
	 */
	provider.authorize.callback = function(data, callback) {
		app.lib.ui.loader.show();
		app.core.api.post('/provider/instagram/callback', data, callback);
	};

   	/**
	 * Get the id of the last post to be used in the "get older feed" request
	 * @param return String
	 */
	provider.getLoadMoreParameter = function() {
		return provider.posts[provider.posts.length - 1].id;
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
			media_id: postId
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
	provider.actions.submitComment = function(postId) {
		return app.lib.ui.modal.show('modals/under-development-modal', { feature: 'Submitting Instagram comments' });
		/*
		if (provider.actions.isCommenting) return false;

		var data = {
			media_id: postId,
			comment: $('#comment-text-' + provider.id + '-' + postId).val()
		};

		if (!provider.specialCompose.canPost(data.comment)) return false;

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
					id: response.id,
					message: data.comment,
					from: {
						name: provider.name,
						id: provider.userId
					},
					created_time: new Date().toString()
				}
			];

			app.core.view.render('feed/generic-comments', {
				comments: newComment,
				provider: provider
			}, function(html) {
				$loading.hide();
				$('#pushout-comments-' + provider.id + '-' + postId).prepend(html).show();
			});
		});

		return false;
		*/
	};

	return provider;
});
