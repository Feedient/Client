app.lib.providers.setBase(function(data) {
	var self = this;

	if (data) {
		this.id = this._id = data.id;
		this.posts = [];
		this.notifications = [];
		this.unreadNotifications = 0;
		this.postCache = {};
		this.name = 'Unknown';
		this.userId = data.provider.username;
		this.accountId = data.provider.user_id;
		this.idKey = 'id';
		this.canPost = true;
		this.canPostWithPicture = true;
		this.providerTokens = data.provider.authentication;
		this.profile_link = '#';
		this.avatar = data.provider.user_avatar;
	}

	// Defaults
	this.icon = 'icon-question';
	this.formattedName = 'Generic';
	this.providerName = 'generic';
	this.isExpandable = true;
	this.hasNotifications = false;
	this.openNotificationsExternally = false;
	this.showUsername = false;
	this.shouldFormatMessage = true;
	this.conversationType = 'comments';

	// Initialize objects
	this.authorize = {};
	this.actions = {};
	this.actions.list = [];
	this.actions.types = {};
	this.specialCompose = {};
	this.notificationsAwaitListeners = [];
	this.notificationsLoaded = false;
	this.notificationsStarted = false;

	/**
	 * Add notifications to the provider
	 * @param Array notifications
	 * @param Boolean isNew
	 */
	this.addNotifications = function(notifications, isNew) {
		if (!self.hasNotifications || !notifications || !notifications.length) return;

		var unread = [];

		for (var i in notifications) {
			if (!self.notificationExists(notifications[i].id)) {
				if (!notifications[i].read) {
					unread.push(notifications[i]);
					self.unreadNotifications++;
				}

				self.notifications.unshift(notifications[i]);
			}
		}

		if (unread.length && isNew) {
			var oldUnreadCount = parseInt($('#notification-number').html());
			var newUnreadCount = oldUnreadCount + unread.length;

			$('#notification-number').html(newUnreadCount);

			if (newUnreadCount) {
				$('#notifications-link').removeClass('no-notifications');
			} else {
				$('#notifications-link').addClass('no-notifications');
			}

			for (var i in unread) {
				app.lib.ui.notification(self.id, unread[i]);
			}
		}
	};

	/**
	 * Check if a notification already exists
	 * @param Int id
	 * @return Boolean
	 */
	this.notificationExists = function(id) {
		for (var i in self.notifications) {
			if (id == self.notifications[i].id) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Mark all unread notifications as read
	 */
	this.markNotificationsAsRead = function() {
		if (!self.notifications.length || !self.hasNotifications) return;

		var unreadIds = [];

		// Loop through notifications to find unread ones
		for (var i in self.notifications) {
			if (!self.notifications[i].read) {
				unreadIds.push(self.notifications[i].id);
				self.notifications[i].read = 1;
			}
		}

		if (!unreadIds.length) return;

		self.unreadNotifications = 0;

		var data = {
			providerId: self.id,
			notifications: JSON.stringify(unreadIds)
		};

		app.core.api.post('/notification', data, function(response) {
			console.log(response);
		});
	};

	/**
	 * Await notification request completion.
	 * Requests are obtained automatically on load,
	 * but via this method you may be notified once
	 * the request is finished. Provides id, notifications
	 * and unread notification count via callback.
	 * @param Function callback
	 */
	this.awaitNotifications = function(callback) {
		if (self.notificationsLoaded) {
			return callback(false, {
				id: self.id,
				notifications: self.notifications,
				unreadCount: self.unreadNotifications
			});
		}

		self.notificationsAwaitListeners.push(callback);
	};

	/**
	 * Get all notifications
	 * @param Function callback
	 */
	this.getNotifications = function(callback) {
		if (!self.hasNotifications) return;

		app.core.log.debug('Loading notifications [' + self.id + ']', 'Providers/Base');
		self.notificationsStarted = true;

		app.core.api.get('/provider/' + self.id + '/notifications', function(response) {
			app.core.log.debug('Loaded notifications [' + self.id + ']', 'Providers/Base');
			self.addNotifications(response.notifications);
			self.notificationsLoaded = true;

			if (self.notificationsAwaitListeners.length) {
				for (var i in self.notificationsAwaitListeners) {
					self.notificationsAwaitListeners[i](false, {
						id: self.id,
						notifications: self.notifications,
						unreadCount: self.unreadNotifications
					});
				}

				self.notificationsAwaitListeners = [];
			}

			if (callback) callback(self.notifications);
		});
	};

	/**
	 * Show the OAuth popup
	 */
	this.authorize.popup = function() {
		app.core.log.error('No authorize.popup implementation provided by ' + this.formattedName + ' provider');
	};

	/**
	 * Call the OAuth callback
	 * @param Object data
	 * @param Function callback
	 */
	this.authorize.callback = function(data, callback) {
		app.core.log.error('No authorize.callback implementation provided by ' + this.formattedName + ' provider');
	};

	/**
	 * Initialize the optional special compose field handler,
	 * such as message length counter.
	 * @param Boolean disabled
	 */
	this.specialCompose.initialize = function(disabled) { };

	/**
	 * Turn the special compose handler on
	 */
	this.specialCompose.on = function() { };

	/**
	 * Turn the special compose handler off
	 */
	this.specialCompose.off = function() { };

	/**
	 * Validate whether the message may be posted
	 * @param String message
	 * @return Boolean
	 */
	this.specialCompose.canPost = function(message) {
		return !!message.length;
	};

	/**
	 * Append @username to empty message field
	 * @param Element field
	 * @param String username
	 */
	this.specialCompose.focusReplyField = function(field, username) { };

	/**
	 * Get the appropriate URL parameter for the 'load more' request,
	 * such as last post timestamp or last post ID
	 * @param return Mixed
	 */
	this.getLoadMoreParameter = function() {
		app.core.log.error('No getLoadMoreParameter implementation provided by ' + this.formattedName + ' provider');
	};

	this.getOlderFeed = function(callback) {
		if (!this.posts) return;

		var parameter = this.getLoadMoreParameter();

		app.services.providers.getOlderFeed(this.id, parameter, function(response) {
			if (response) {
				for (var i in response) {
					if (!self.postExists(response[i])) {
						self.posts.push(response[i]);
					} else {
						response[i] = undefined;
					}
				}
			}

			// Remove soft-deleted posts
			response = response.filter(function(n) {
				return n;
			});

			callback(response);
		});
	};


 	/**
	 * Get the latest posts in the feed
	 * @param Function callback
	 */
	this.getFeed = function(callback) {
		if (this.posts.length) return callback(this.posts);

		app.services.providers.getFeed(self.id, function(response) {
			if (response && response.error) {
				app.core.log.error('Failed to load feed for ' + self.id + ' [' + self.formattedName + ']', 'Provider/Base');
				console.log(response);

				return callback(response);
			}
			
			self.posts = response.posts;
			console.log('self.posts length: ' + self.posts.length);
			console.log('app.lib.user.getProvider length: ' + app.lib.user.getProvider(self.id).posts.length);

			app.core.log.debug('Added ' + self.posts.length + ' (of ' + response.posts.length + ') posts from feed endpoint to ' + self.id + ' [' + self.formattedName + ']', 'Provider/Base');
			callback(self.posts);
		}, function(endpoint, request) {
			app.core.view.render('feed/api-error', { provider: self, error: 'Unable to connect to ' + self.formattedName }, '#posts-' + self.id);
		});
	};

	/**
	 * Get a post by ID
	 * @param Int postId
	 * @param Function callback
	 */
	this.getPost = function(postId, callback) {
		if (!postId) return;

		// First check feed posts
		if (self.posts.length) {
			for (var i in self.posts) {
				if (self.posts[i][self.idKey] == postId) {
					if (!callback) return self.posts[i];

					return callback(self.posts[i]);
				}
			};
		}

		// Secondly check post cache (not in feed; only conversation posts and similar)
		if (self.postCache[postId]) {
			if (!callback) return self.postCache[postId];

			return callback(self.postCache[postId]);
		}

		// If no callback was provided, we only want in-feed posts
		if (!callback) return false;

		// Request the post from the server
		app.core.api.get('/provider/' + self.id + '/post/' + postId, function(response) {
			if (response && response.post) {
				self.postCache[postId] = response.post;
				return callback(response.post);
			}

			return callback(false);
		});
	};

	/**
	 * Get the index of a post
	 * @param Int postId
	 * @return Int
	 */
	this.getPostIndex = function(postId) {
		if (!postId || !this.posts.length) return;

		for (var i in this.posts) {
			if (this.posts[i][this.idKey] == postId) return i;
		}

		return false;
	};

	/**
	 * Check if a post exists in the cache
	 * @param Object post
	 * @return Bool
	 */
	this.postExists = function(post) {
		if (!post || !self.posts.length) {
			return false;
		}

		for (var i in self.posts) {
			if (self.posts[i].id == post.id) {
				return true;
			}
		}

		return false;
	};

	/**
	 * Get the comments and show it's UI
	 * @param Int postId
	 * @param String element
	 */
	this.getComments = function(postId, element) {
		if (!element) var element = 'pushout';

		app.core.api.get('/provider/' + this.id + '/' + postId + '/comments', function(data) {
			if (data.error) {
				$('#overlays-' + self.id).html('');
				return;
			}

			data.post_link = self.getPost(postId).post_link;

			if (data.comments && data.comments.length) {
				return app.core.view.render('feed/generic-comments', data, '#' + element + '-comments-' + self.id + '-' + postId);
			}

			// Remove loading spinner
			$('#' + element + '-comments-' + self.id + '-' + postId).html('');
		});
	};

	/**
	 * Get the comments as an array
	 */
	this.getCommentsModel = function(postId, callback) {
		app.core.api.get('/provider/' + this.id + '/' + postId + '/comments', function(data) {
			if (data.error) return callback(data.error);

			if (!data.comments || !data.comments.length) {
				return callback("Empty comments");
			}

			return callback(null, data.comments);
		});
	};

	/**
	 * Get the conversation and show it's UI
	 * @param Int postId
	 * @param String element
	 */
	this.getConversation = function(postId, element) {
		if (!element) var element = 'pushout';

		self.getPost(postId, function(postData) {
			var userId = postData.user.name_formatted.replace('@', '');

			app.core.api.get('/provider/' + self.id + '/' + postId + '/comments?userId=' + userId, function(data) {
				if (data.error) {
					$('#overlays-' + self.id).html('');
					return;
				}

				var viewData = {
					provider: self,
					isConversation: true
				};

				if (data.parents.length) {
					data.parents.sort(function(a, b) {
						return a.content.date_created - b.content.date_created;
					});

					// Render the parent posts
					viewData.posts = data.parents;
					app.core.view.render('feed/generic', viewData, '#' + element + '-parents-' + self.id + '-' + postId);
				} else {
					// Remove loading spinner
					$('#' + element + '-parents-' + self.id + '-' + postId).html('');
				}

				if (data.comments.length) {
					data.comments.sort(function(a, b) {
						return a.content.date_created - b.content.date_created;
					});

					// Render the replies
					viewData.posts = data.comments;
					app.core.view.render('feed/generic', viewData, '#' + element + '-replies-' + self.id + '-' + postId);
				} else {
					// Remove loading spinner
					$('#' + element + '-replies-' + self.id + '-' + postId).html('');
				}
			});
		});
	};

	/**
	 * Get the action count and show it's UI
	 * @param Int postId
	 * @param String element
	 */
	this.getActionCount = function(postId, element) {
		if (!element) var element = 'pushout';

		app.core.api.get('/provider/' + self.id + '/' + postId, function(data) {
			if (data.error) return;

			var actionCountHTML = '';
			for (var i in data.post.content.action_counts) {
				if (data.post.content.action_counts[i]) {
					actionCountHTML += '<div class="action-count"><strong>' + data.post.content.action_counts[i] + '</strong> ' + i.toUpperCase() + '</div>';
				}
			}

			if (actionCountHTML) {
				$('#' + element + '-' + self.id + '-' + postId + '-action-count').html(actionCountHTML).show();
			}
		});
	};

	this.getActionCountModel = function(postId, callback) {
		app.core.api.get('/provider/' + self.id + '/' + postId, function(data) {
			if (data.error) return callback(data.error);
			return callback(null, data.post.content.action_counts);
		});
	};


	/**
	 * Image lightbox UI
	 * @param String postId
	 * @param String imageURL
	 */
	this.actions.lightbox = function(postId, imageURL) {
		var $left, $right;
		var animationHasRun = false;
		setTimeout(function() { animationHasRun = true; }, 300);

		// First close all overlays, since they can interfere with eachother
		// like if you submit a comment in lightbox it might get displayed in the ordinary expanded view
		app.lib.ui.columnOverlay.hideAll(self.id);

		/**
		 * Render the post and pass the HTML along
		 * @param Function callback(error, result)
		 */
		var renderPost = function(callback) {
			self.getPost(postId, function(postData) {
				var postViewData = {
					posts: [ postData ],
					isConversation: true,
					hideActions: true,
					hidePhotos: true,
					expandText: true,
					provider: self
				};

				app.core.view.render('feed/generic', postViewData, function(postHTML) {
					var conversationViewData = {
						provider: self,
						post: postHTML,
						postData: postData,
						elementId: 'lightbox'
					};

					if (['comments', 'conversation'].indexOf(self.conversationType) == -1) {
						return callback(null, postHTML);
					}

					app.core.view.render('feed/post-' + self.conversationType, conversationViewData, function(HTML) {
						callback(null, HTML);
					});
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
				provider: self,
				imageURL: imageURL
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
		var loadImage = function(callback) {
			var $image = $('#lightbox-image');
			var imgElement = document.createElement('img');
			imgElement.src = imageURL;

			imgElement.onerror = function() {
				app.core.log.warning('Image could not be loaded (Could be SSL certificate issues?)', 'Base/Lightbox');
				console.log($left);

				$left.css({
					backgroundImage: 'url(/app/images/image-error.png)'
				});

				callback();
			};

			imgElement.onload = function() {
				var resize = function() {
					if (!animationHasRun) return setTimeout(resize, 50);

					// Get the image's ratio
					var ratio = imgElement.width / imgElement.height;

					// Calculate the required left size, based on the ratio
					width = Math.round(ratio * $left.height());

					// Make sure it fits in the window
					if (width > window.innerWidth-500) {
						width = window.innerWidth-500;
					}

					// No need to make the width more than the image itself
					if (width > imgElement.width) {
						width = imgElement.width;
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
							backgroundImage: 'none'
						});

						// Set the image and specify size
						$image.attr('src', imageURL).css({
							width: imgElement.width,
							height: imgElement.height,
							maxWidth: width,
							maxHeight: Math.round(width / ratio)
						}).show().animate({ opacity: 1 }, 300);

						// Calculate the required positioning values (center the image if it doesn't fill the left height or width)
						var marginTop = ($image.height() >= $left.height()) ? 0 : $image.height()/-2;
						var marginLeft = ($image.width() >= width) ? 0 : $image.width()/-2;
						var left = ($image.width() >= width) ? 0 : '50%';
						var top = ($image.height() >= $left.height()) ? 0 : '50%';

						// Set the positioning
						$image.css({
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
		};

		/**
		 * Load comments
		 */
		var loadComments = function() {
			switch (self.conversationType) {
				case 'conversation':
					self.getConversation(postId, 'lightbox');
					break;

				case 'comments':
					self.getComments(postId, 'lightbox');
					break;
			};
		};

		/**
		 * Load action counts
		 */
		var loadActionCounts = function() {
			self.getActionCount(postId, 'lightbox');
		};

		// Render post then lightbox
		async.waterfall([ renderPost, renderLightbox, loadImage ], function() {
			// Get image, comments and action counts in parallel
			async.parallel([ loadComments, loadActionCounts ]);

			try {
				self.initMessageLimitations(postId);
			}
			 catch(err) {

    		}
		});
	};
});
