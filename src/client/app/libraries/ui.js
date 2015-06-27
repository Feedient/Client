app.lib.ui = function() {
	var self = this;
	var lastMain = false;

	/**
	 * Loader image UI object
	 */
	self.loader = {
		showTime: false,

		show: function() {
			self.loader.showTime = new Date();

			$('#loading').show().css({ opacity: 1 });
		},

		hide: function() {
			var $loading = $('#loading');

			// Fade out and hide after 300ms if the loader is shown
			if ($loading.css('display') != 'none'
				&& (app.lib.ui.loader.showTime && (new Date() - app.lib.ui.loader.showTime) > 300)) {
				$loading.css({opacity:0});
				setTimeout(function() { $loading.hide(); }, 300);
			} else {
				$loading.css({opacity:0}).hide();
			}

			self.loader.showTime = false;
		}
	};

	/**
	 * Detailed post/conversation view columnOverlay UI object
	 */
	self.columnOverlay = {
		overlayCount: 0,
		hideListeners: {},

		show: function(providerId, view, data, callback, hideCallback) {
			// Support no data or callback arguments
			if (!data && !callback) {
				var data = {};
				// Support callback as third argument
			} else if (typeof data == 'function') {
				var callback = data;
				data = {};
			}

			// Make an ID
			self.columnOverlay.overlayCount++;
			var overlayId = self.columnOverlay.overlayCount;

			if (hideCallback) {
				self.columnOverlay.hideListeners[overlayId] = hideCallback;
			}

			app.core.view.render('feed/column-overlay', { overlayId: overlayId, zIndex: 1000 + overlayId }, function(HTML) {
				$('#overlays-' + providerId).append(HTML);

				setTimeout(function() {
					$('#overlay-' + overlayId).addClass('overlay-visible');
					var $overlayBase = $('#overlay-' + overlayId).parents('.overlays-container').siblings('.posts');


					if (!$overlayBase.length) {
						$overlayBase = $('#posts-' + providerId);
					}

					$overlayBase.addClass('overlay-active');
				}, 10);

				app.core.view.render(view, data, '#overlay-content-' + overlayId, function() {
					if (callback) callback(overlayId);
				});
			});
		},

		hide: function(overlayId) {
			var $element = $('#overlay-' + overlayId);
			$element.removeClass('overlay-visible');

			if (!$element.siblings().length) {
				$element.parents('.overlays-container').siblings('.posts').removeClass('overlay-active');
			}

			if (self.columnOverlay.hideListeners[overlayId]) {
				self.columnOverlay.hideListeners[overlayId]();
				self.columnOverlay.hideListeners[overlayId] = false;
			}

			setTimeout(function() { $element.remove(); }, 500);
		},

		hideAll: function (providerId) {
			var $elements = $('#overlays-' + providerId);

			$elements.children().each(function() {
				var overlayId = $(this).attr('id').replace('overlay-', '');

				if (self.columnOverlay.hideListeners[overlayId]) {
					self.columnOverlay.hideListeners[overlayId]();
					self.columnOverlay.hideListeners[overlayId] = false;
				}

				$(this).remove();
			});

			$elements.siblings('.posts').removeClass('overlay-active');
		}
	};

	/**
	 * Compose modal popup UI object
	 */
	self.compose = {
		show: function() {
			if (!localStorage.disabled) {
				localStorage.disabled = '[]';
			}

			var disabledProviders = JSON.parse(localStorage.disabled);

			app.lib.user.getProviders(function(userProviders) {
				var providerCount = 0;

				for (var i in userProviders) {
					if (userProviders[i].canPost) {
						if(disabledProviders.indexOf(userProviders[i]._id) !== -1) {
							userProviders[i].disabled = true;
						} else {
							userProviders[i].disabled = false;
							providerCount++;
						}
					} else {
						userProviders[i].hidden = true;
					}
				}

				self.modal.show('modals/compose', { userProviders: userProviders, count: providerCount }, { width: 440 }, function() {
					for (var i in userProviders) {
						if (!userProviders[i].hidden && userProviders[i].specialCompose) {
							userProviders[i].specialCompose.initialize(userProviders[i].disabled);
						}
					}

					$('#compose-picture-upload').on('change', function(e) {
						$('#compose-error').hide();

						if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
							app.core.log.warning('HTML5 File API not supported, unable to determine file size', 'UI/Compose');
							return;
						}

						if (!e.target.files.length) return;

						// Invalid file type
						if (app.config.fileUpload.supportedFileTypes.indexOf(e.target.files[0].type) == -1) {
							$('#compose-error').show();
							$('#compose-error-message').html('Image must be of file type JPG, PNG or GIF.');
							return;
						}

						// Too large file size
						if (e.target.files[0].size > app.config.fileUpload.maxFileSize) {
							// Format bytes as MB and round to one decimal
							var size = Math.round(e.target.files[0].size / 1024 / 1024 * 10) / 10;

							$('#compose-error').show();
							$('#compose-error-message').html('Image must be smaller than 10 MB. Your image was ' + size + ' MB.');
							return;
						}
					});
				});
			});
		},

		/**
		 * Toggle whether the message should be posted to a provider
		 * @param String providerId
		 * @param String providerName
		 * @param Element element
		 */
		toggleProvider: function(providerId, providerName, element) {
			var $element = $(element);

			if ($element.hasClass('toggle-off')) {
				$element.removeClass('toggle-off');

				var disabledProviders = JSON.parse(localStorage.disabled);
				disabledProviders.splice(disabledProviders.indexOf(providerId), 1);
				localStorage.disabled = JSON.stringify(disabledProviders);

				app.lib.user.getProvider(providerId).specialCompose.on();
			} else {
				$element.addClass('toggle-off');

				var disabledProviders = JSON.parse(localStorage.disabled);
				disabledProviders.push(providerId);
				localStorage.disabled = JSON.stringify(disabledProviders);

				var selectedCountOfSameProvider = $('#compose-accounts .' + providerName + '-toggle').length - $('#compose-accounts .' + providerName + '-toggle.toggle-off').length;

				if (selectedCountOfSameProvider == 0) {
					app.lib.user.getProvider(providerId).specialCompose.off();
				}
			}

			$('#selected-count').html($('#compose-accounts a').length - $('#compose-accounts .toggle-off').length);
		},

		/**
		 * Submit the message to the API backend
		 * which submits it to each provider
		 */
		submit: function() {
			var message = $('#compose-text').val();
			var pictures = $('#compose-picture-upload')[0].files;
			var providers = [];

			// If the provider button is selected, add the provider to post to
			$('#compose-accounts a').each(function() {
				if (!$(this).hasClass('toggle-off')) {
					var providerName = $(this).attr('class').replace(/^toggle-button ([a-zA-Z]+)-toggle ?/, '$1');
					providers.push($(this).attr('data-providerId'));
				}
			});

			// Blank message
			if ((!message.length && !pictures) || !providers.length) return;

			// Check for length limits and picture attachment support
			var tempProvider;
			$('#compose-error').hide();

			for (var i in providers) {
				tempProvider = app.lib.user.getProvider(providers[i]);

				if (!tempProvider.specialCompose.canPost(message)) {
					return;
				}

				if (!tempProvider.canPostWithPicture) {
					$('#compose-error').show();
					$('#compose-error-message').html(tempProvider.formattedName + ' does not support image attachments.');
					return;
				}
			}

			app.lib.ui.modal.hide();

			for (var i in providers) {
				$('#posts-' + providers[i]).prepend('<div class="inline-loading compose-loader" style="margin:0;padding:50px;border-bottom:1px solid #e1e1e1;"></div>');
			}

			// If we got a picture, then call the postMessageWithPicture, else call postMessage
			if (pictures && pictures.length) {
				return app.lib.ui.compose.postMessageWithPicture(providers, message, pictures);
			}

			return app.lib.ui.compose.postMessage(providers, message);
		},

		postMessage: function(providers, message) {
			app.services.providers.postMessage(JSON.stringify(providers), message, function(err, response) {
				// If done loading, remove loader
				$('.compose-loader').remove();

				// Add listeners
				if (response && response.length) {
					for (var i in response) {
						var provider = app.lib.user.getProvider(response[i].provider);
						app.lib.ui.compose.addPostListener(provider, response[i], message);
					}
				}
			});
		},

		postMessageWithPicture: function(providers, message, pictures) {
			app.services.providers.postMessageWithPicture(JSON.stringify(providers), message, pictures[0], function(err, response) {
				// If done loading, remove loader
				$('.compose-loader').remove();

				// Add listeners
				if (response && response.length) {
					for (var i in response) {
						var provider = app.lib.user.getProvider(response[i].provider);
						app.lib.ui.compose.addPostListener(provider, response[i], message);
					}
				}
			});
		},

		addPostListener: function(provider, post, message) {
			// Fake a post
			var posts = [{
				id: post.post_id,
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
					is_conversation: false,
					message: message,
					title: null
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
			app.lib.stream.await(provider.id, post.post_id, function(postData, callbackProviderId) {
				var callbackProvider = app.lib.user.getProvider(callbackProviderId);

				var $post = $('#post-' + callbackProvider.id + '-' + postData.id);
				$post.find('.avatar img').first().attr('src', postData.user.image);

				// "real name" wasn't available
				if (!posts[0].user.name || posts[0].user.name == posts[0].user.name_formatted) {
					$post.find('.real-name').first().html(postData.user.name);
				}

				// Correct the post link
				$post.find('.time').first().attr('href', postData.post_link);

				// Format the message
				var $message = $post.find('.message').first();
				$message.html(app.helpers.formatMessage(postData.content.message, postData.content.entities, callbackProvider.id, postData.id));

				var index = provider.getPostIndex(postData.id);
				if (!index) return;

				callbackProvider.posts[index] = postData;
			});
		}
	}

	self.home = function() {
		// Give the user a "pass" to access the homepage without being redirected to the app
		$.cookie('home', '1', { expires: 365, path: '/' });
		window.location = '/';
	};

	self.logout = {
		confirm: function() {
			app.lib.ui.modal.show('modals/logout');
		},

		submit: function() {
			app.lib.ui.modal.hide();
			app.lib.ui.loader.show();

			app.core.api.get('/logout', function(response) {
				$.removeCookie('token', { path: '/' });
				window.location = '/';
			});
		}
	};

	/**
	 * Show a short message in a toast UI element
	 * @param String message
	 * @param String icon
	 * @param Int duration
	 */
	self.toast = function(message, icon, duration) {
		if (!duration) var duration = 3000;

		if (icon) {
			message = '<i class="fa ' + icon + '"></i> ' + message;
		}

		var $toast = $('#toast');

		$toast.html(message).addClass('show-toast');

		setTimeout(function() {
			if ($toast.html() == message) {
				$toast.html('').removeClass('show-toast');
			}
		}, duration);
	};

	/**
	 * Display a notification
	 */
	self.notification = function(providerId, postData) {
		var $alerts = $('#notification-alerts');

		// Max 4 notifications at once
		if ($alerts.children().length >= 4) {
			$alerts.children().each(function(index) {
				if (index >= 3) {
					$(this).remove();
				}
			});
		}

		var provider = app.lib.user.getProvider(providerId);

		if (!provider) return;

		var viewData = {
			provider: provider,
			post: postData
		};

		// Render a new notification
		app.core.view.render('/modals/notification-alert', viewData, function(HTML) {
			var $notification = $(HTML);
			$alerts.prepend($notification);

			$notification.addClass('show-toast');

			// Remove on click
			$notification.on('click', function(e) {
				$notification.remove();

				// Didn't the user click the close button?
				if (e.target.className != 'close-link' && e.target.className != 'fa fa-times') {
					// Open notifications
					app.controllers.notifications();
				}
			});

			// Remove notification if it still exists after 5 sec
			setTimeout(function() {
				if ($notification) {
					$notification.remove();
				}
			}, 60000);
		});
	};

	/**
	 * Modal popup UI object
	 */
	self.modal = {
		$modal: false,
		$modalBg: false,

		/**
		 * Show a modal popup
		 * @param String viewId
		 * @param Array viewData
		 * @param Array/Int properties
		 * @param Function callback
		 */
		show: function(viewId, viewData, properties, callback) {
			self.modal.$modal = $('#modal');
			self.modal.$modalBg = $('#modal-bg');

			// Handle default values
			if (!properties) {
				properties = {};
			} else if (!$.isPlainObject(properties)) {
				properties = {
					width: properties
				};
			}

			if (typeof properties.width == 'undefined') properties.width = 340;
			if (typeof properties.height == 'undefined') properties.height = 'auto';
			if (typeof properties.padding == 'undefined') properties.padding = 30;
			if (typeof properties.overflow == 'undefined') properties.overflow = 'auto';

			var marginTop = properties.marginTop;
			if (!marginTop) {
				marginTop = (properties.height != 'auto') ? '-' + ((properties.height + properties.padding*2)/2) + 'px' : 0;
			}

			var top = properties.top;
			if (!top) {
				top = (properties.height != 'auto') ? '50%' : '20%';
			}

			self.modal.$modal.css({
				overflow: properties.overflow,
				width: properties.width + 'px',
				marginLeft: '-' + ((properties.width + properties.padding*2)/2) + 'px',
				padding: properties.padding + 'px',
				height: (properties.height != 'auto' && !/%/.test(properties.height)) ? properties.height + 'px' : properties.height,
				top: top,
				marginTop: marginTop
			});

			self.modal.$modal.removeClass('show-modal');

			self.modal.$modalBg.off('click');

			app.core.view.render(viewId, viewData, '#modal', function() {
				self.modal.$modal.addClass('show-modal');
				self.modal.$modalBg.show().animate({ opacity: 0.8 }, 500);

				self.modal.$modalBg.on('click', app.lib.ui.modal.hide);

				if (callback) callback();
			});
		},

		resize: function(width, height) {
			var padding = self.modal.$modal.css('padding').replace('px', '');
			var css = {};

			if (width) {
				css.width = width + 'px';
				css.marginLeft = '-' + ((width + padding*2)/2) + 'px';
			}

			if (height) {
				css.height = height + 'px';
				css.marginTop = '-' + ((height + padding*2)/2) + 'px';
			}

			self.modal.$modal.animate(css, 300);
		},

		hide: function() {
			if (!self.modal.$modal) return;

			// Reset custom styles
			self.modal.$modal.attr('style', '');

			self.modal.$modal.removeClass('show-modal');

			self.modal.$modal.html('');
			self.modal.$modalBg.hide().css({ opacity: 0 });
		}
	};

	/**
	 * Show the feedback modal
	 */
	self.feedback = {
		show: function() {
			app.lib.ui.modal.show('modals/feedback');
		},

		help: function() {
			var viewData = {
				email: app.lib.user.getEmail()
			};

			app.lib.ui.modal.show('modals/feedback-help', viewData, { height: 380 });
		},

		submitHelp: function() {
			// Replace this with your subdomain!
			var uvSubdomain = "feedient";

			// Create an API client (non-trusted) within the UserVoice settings/channels section.  Paste the key only here.
			var uvKey = "afyW1G4QwvuGaHFP5cSyw";

			// Grab the data we need to send
			var message = $('#feedback-message').val();
			var subject = $('#feedback-subject').val();
			var email = $('#feedback-email').val();

			if (!message.length || !subject.length || !email.length) {
				return;
			}

			$('#feedback-form').html('<center><div class="inline-loading"></div></center>');

			// Execute the JSONP request to submit the ticket
			$.ajax({
				url: 'https://' + uvSubdomain + '.uservoice.com/api/v1/tickets/create_via_jsonp.json?callback=?',
				data: {
					client: uvKey,
					ticket: {
						message: message,
						subject: subject
					},
					email: email
				},
				success: function(data) {
					$('#feedback-form').html('<p>Sent! We will respond to your support request as soon as possible.</p>');
					app.lib.ui.modal.$modal.css({ height: '135px '});
				},
				error: function(d, msg) {
					$('#feedback-form').html('<p>' + msg + '</p>');
					app.lib.ui.modal.$modal.css({ height: '135px '});
				}
			});

			return false;
		}
	};

	/**
	 * Trigger inline video
	 * @param String url
	 * @param Object element
	 */
	self.inlineVideo = function(url, element) {
		console.log(url);
		$(element).parent('.video-holder').html('<video width="352" height="200" controls autoplay><source src="' + url + '" type="video/mp4"></video>');
	};

	self.showAdExplanation = function() {
		app.lib.ui.modal.show('modals/ad-explanation');
	};

	// Active menu link UI change
	app.core.hooks.on('route', function(data, next) {
		$('nav .active').removeClass('active');

		var url = data.path;

		// Make sure we can match ./ as /
		if (url == '/') {
			url = './';
		} else if(url != './') {
			// Remove / from the beginning
			if (/^\//.test(url)) url = url.substr(-url.length + 1, url.length);

			// Remove / from the end
			if (/\/$/.test(url)) url = url.substr(0, url.length - 1);
		}

		// Find the correct menu link
		$('nav li a[href="' + url + '"]').parent().addClass('active');

		next();
	});

	app.core.hooks.on('ready', function(data, next) {
		if (app.lib.user.getRole() == 'ADMIN') {
			$('#admin').show();
		}

		// Register hotkeys
		app.lib.hotkeys.on('*', 'escape', app.lib.ui.modal.hide);
		app.lib.hotkeys.on('*', 'n', app.lib.ui.compose.show);
		app.lib.hotkeys.on('*', 'c', app.lib.ui.compose.show);

		next(data);
	});
};
