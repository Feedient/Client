app.lib.providers.add('youtube', function(provider, data) {
	provider.icon = app.config.providers.youtube.icon;
	provider.formattedName = app.config.providers.youtube.formattedName;
	provider.providerName = 'youtube';
	provider.comments = {};
	provider.isExpandable = false;
	provider.canPost = false;
	provider.conversationType = 'none';

	if (data) {
		provider.name = data.provider.username;
	}

	/**
	 * List of actions and their UI data
	 */
    provider.actions.list = [
        {
            text: {
                normal: app.core.i18n.get('youtube:like'),
                performed: app.core.i18n.get('youtube:liked')
            },
            icon: 'fa fa-thumbs-up',
            method: 'like',
            performed_key: 'liked'
        },

        {
            text: {
                normal: app.core.i18n.get('youtube:dislike'),
                performed: app.core.i18n.get('youtube:disliked')
            },
            icon: 'fa fa-thumbs-down',
            method: 'dislike',
            performed_key: 'disliked'
        }
    ];

	/**
	 * Show the OAuth popup
	 */
	provider.authorize.popup = function() {
		app.helpers.popup('https://accounts.google.com/o/oauth2/auth?client_id=' + encodeURIComponent(app.config.providers.youtube.APP_ID) + '&response_type=code&scope=https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube&access_type=offline&approval_prompt=force&redirect_uri=' + encodeURIComponent(window.location.origin + '/app/callback/youtube'), 560, 400);
	};

	/**
	 * Call the OAuth callback
	 * @param Object data
	 * @param Function callback
	 */
	provider.authorize.callback = function(data, callback) {
		app.lib.ui.loader.show();
		app.core.api.post('/provider/youtube/callback', data, callback);
	};

	/**
	 * Get the time for the last post, formatted appropriately for "get older feed"
	 * @param return Int
	 */
	provider.getLoadMoreParameter = function() {
		var pagination_id = provider.posts[provider.posts.length - 1].pagination_id;

		return pagination_id;
	};

	provider.actions.show = function(postId) {
		return provider.actions.lightbox(postId);
	}

	/**
	 * Video lightbox UI
	 * @param String postId
	 */
	provider.actions.lightbox = function(postId) {
		var $left, $right;
		var animationHasRun = false;
		setTimeout(function() { animationHasRun = true; }, 300);

		/**
		 * Render the post and pass the HTML along
		 * @param Function callback(error, result)
		 */
		var renderPost = function(callback) {
			var postData = provider.getPost(postId);
			var postViewData = {
				posts: [ postData ],
				isConversation: true,
				hideActions: true,
				hidePhotos: true,
				expandText: true,
				provider: provider
			};

			app.core.view.render('feed/generic', postViewData, function(postHTML) {
				var conversationViewData = {
					provider: provider,
					post: postHTML,
					postData: postData
				};
				app.core.view.render('feed/post-video', conversationViewData, function(HTML) {
					callback(null, HTML);
				});
			});
		};

		/**
		 * Render the lightbox
		 * @param String postHTML
		 * @param Function callback(error, result)
		 */
		var renderLightbox = function(postHTML, callback) {
			var lightboxData = {
				postView: postHTML,
				provider: provider
			};

			var properties = {
				height: '90%',
				top: '5%',
				marginTop: 0,
				width: 800,
				padding: 0
			};

			app.lib.ui.modal.show('modals/lightbox', lightboxData, properties, function() {
				$left = $('#lightbox-left-side');
				$right = $('#lightbox-right-side');

				callback();
			});
		};

		/**
		 * Load image and resize lightbox
		 */
		var loadVideo = function(callback) {
			var $video = $('#lightbox-video');

			var resize = function() {
				if (!animationHasRun) return setTimeout(resize, 50);
				var video = { width: 1280, height: 720 };

				// Get the video ratio
				var ratio = 1280 / 720; // Assume 720p

				// Calculate the required left size, based on the ratio
				width = Math.round(ratio * $left.height());

				// Make sure it fits in the window
				if (width > window.innerWidth-500) {
					width = window.innerWidth-500;
				}

				// No need to make the width more than the image itself
				if (width > video.width) {
					width = video.width;
				}

				// If we resize down, we must animate the left width at the same time to avoid glitchy layout bugs
				if (width+400 < 800) {
					$left.animate({width: width}, 300);
				}

				app.lib.ui.modal.resize(width+400);

				// Resize animation runs for 300ms, wait until it's done
				setTimeout(function() {
					// Set the left width and hide the loading spinner
					$left.css({
						width: width,
						backgroundImage: 'none',
						backgroundColor: '#000'
					});

					// Set the image and specify size
					$video.attr('src', 'https://www.youtube.com/embed/' + postId + '?autoplay=1').css({
						width: video.width,
						height: $left.height(),
						maxWidth: width,
						maxHeight: $left.height()
					}).show().animate({ opacity: 1 }, 300);

					// Calculate the required positioning values (center the image if it doesn't fill the left height or width)
					var marginTop = ($video.height() >= $left.height()) ? 0 : $video.height()/-2;
					var marginLeft = ($video.width() >= width) ? 0 : $video.width()/-2;
					var left = ($video.width() >= width) ? 0 : '50%';
					var top = ($video.height() >= $left.height()) ? 0 : '50%';

					// Set the positioning
					$video.css({
						marginLeft: marginLeft,
						marginTop: marginTop,
						left: left,
						top: top
					});

				}, 300);
			};

			resize();
			callback();
		};

		/**
		 * Load comments
		 */
		var loadComments = function() {
			// Todo: implement comments
		};

		/**
		 * Load action counts
		 */
		var loadActionCounts = function() {
			provider.getActionCount(postId, 'lightbox');
		};

		// Render post then lightbox
		async.waterfall([ renderPost, renderLightbox, loadVideo ], function() {
			// Get image, comments and action counts in parallel
			async.parallel([ loadComments, loadActionCounts ]);
		});
	};

	provider.actions.like = function(postId, element, isPushout) {
		var $post;

		if (isPushout) {
			$post = $('#post-' + provider.id + '-' + postId);
		} else {
			$post = $(element).parents('.post');
		}

		var undo = false;
		var index = provider.getPostIndex(postId);
		var $dislikeButton = $post.find('.dislike-link');
		var $likeButton = $post.find('.like-link');
		var $pushoutLikeButton = $('#pushout-' + provider.id + '-' + postId + ' .like-button');
		var $pushoutDislikeButton = $('#pushout-' + provider.id + '-' + postId + ' .dislike-button');

		/**
		 * Change the UI to be "unliked"
		 */
		var unlike = function() {
			$likeButton.removeClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Like');
			$pushoutLikeButton.removeClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Like');
		};

		/**
		 * Change the UI to be "liked"
		 */
		var like = function() {
			$likeButton.addClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Liked');
			$dislikeButton.removeClass('color-disliked').html('<i class="fa fa-thumbs-down"></i> Dislike');
			$pushoutLikeButton.addClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Liked');
			$pushoutDislikeButton.removeClass('color-disliked').html('<i class="fa fa-thumbs-down"></i> Dislike');
			provider.posts[index].content.actions_performed.disliked = false;
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

	provider.actions.dislike = function(postId, element, isPushout) {
		var $post;

		if (isPushout) {
			$post = $('#post-' + provider.id + '-' + postId);
		} else {
			$post = $(element).parents('.post');
		}

		var undo = false;
		var index = provider.getPostIndex(postId);
		var $dislikeButton = $post.find('.dislike-link');
		var $likeButton = $post.find('.like-link');
		var $pushoutLikeButton = $('#pushout-' + provider.id + '-' + postId + ' .like-button');
		var $pushoutDislikeButton = $('#pushout-' + provider.id + '-' + postId + ' .dislike-button');

		/**
		 * Change the UI to be "undisliked"
		 */
		var undislike = function() {
			$dislikeButton.removeClass('color-disliked').html('<i class="fa fa-thumbs-down"></i> Dislike');
			$pushoutDislikeButton.removeClass('color-disliked').html('<i class="fa fa-thumbs-down"></i> Dislike');
		};

		/**
		 * Change the UI to be "disliked"
		 */
		var dislike = function() {
			$dislikeButton.addClass('color-disliked').html('<i class="fa fa-thumbs-down"></i> Disliked');
			$likeButton.removeClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Like');
			$pushoutDislikeButton.addClass('color-disliked').html('<i class="fa fa-thumbs-down"></i> Disliked');
			$pushoutLikeButton.removeClass('color-liked').html('<i class="fa fa-thumbs-up"></i> Like');
			provider.posts[index].content.actions_performed.liked = false;
		};

		var undo = provider.posts[index].content.actions_performed.disliked;

		if (undo) {
			undislike();
		} else {
			dislike();
		}

		provider.posts[index].content.actions_performed.disliked = !undo;

		var action = undo ? 'unlike' : 'dislike';

		app.core.api.post('/provider/' + provider.id + '/action/' + action, {
			media_id: postId,
		}, function(data) {
			if (!data || data.error) {
				app.core.log.error(data);

				provider.posts[index].content.actions_performed.disliked = !undo;

				// Revert the UI changes
				if (undo) {
					like();
					app.lib.ui.toast(app.core.i18n.get('toast.undo_dislike_failed'), 'fa-warning');
				} else {
					unlike();
					app.lib.ui.toast(app.core.i18n.get('toast.dislike_failed'), 'fa-warning');
				}
			}
		});
	};

	return provider;
});
