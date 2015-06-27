app.core.router.get('/settings', function() {
	var self = this;

	/**
	 * Triggered on the 'change' select field event.
	 * Submit the language settings to the API server
	 * @param String value
	 */
	this.changeLanguage = function(value) {
		app.lib.ui.loader.show();
		
		var data = {
			language: value.replace('-', '_')
		};
		
		app.core.api.put('/user', data, function(response) {
			app.lib.ui.loader.hide();

			if (response.updateLanguage && response.updateLanguage.success) {
				$('#language-settings-success').removeClass('hidden');

				setTimeout(function() {
					window.location.reload(true);
				}, 500);
			}
		});
	};

	/** 
	 * Submit the account form
	 */
	this.submitAccountSettings = function() {
		var $fields = {
			oldPassword: $('#old-password')
		};

		var changeEmail = false;
		var changePassword = false;

		if ($('#email').val() != app.lib.user.getEmail()) {
			changeEmail = true;
			$fields.email = $('#email');
		}

		if ($('#password').val().length) {
			changePassword = true;
			$fields.password = $('#password');
			$fields.password2 = $('#password2');
		}

		// We need either password or email to change something
		if (!$fields.email && !$fields.password) return false;

		var failed = false;

		for (var i in $fields) {
			if (!this.validation[i]($fields[i])) {
				failed = true;
			}
		}

		if (failed) return false;

		var data = {
			oldPassword: $fields.oldPassword.val()
		};

		// Is the user trying to cahgne the email?
		if (changeEmail) data.email = $fields.email.val();

		// Is the user trying to change the password?
		if (changePassword) data.password = $fields.password.val();

		app.lib.ui.loader.show();

		app.core.api.put('/user', data, function(response) {
			app.lib.ui.loader.hide();

			if (response.error) {
				if (response.error.code == 4011) {
					$fields.oldPassword.addClass('error');
				}
			}

			// Handle email change
			if (response.setEmail) {

			}

			// Handle password change
			if (response.updatePassword) {
				animateClearSessions();

				if (response.updatePassword.token) {
					$.cookie('token', response.updatePassword.token, { expires: 365, path: '/' });
					app.lib.user.reloadToken();
				}
			}

			// Show success message
			if (changeEmail) {
				$('#account-settings-success').addClass('hidden');
				$('#account-settings-email-success').find('.email').first().html(app.lib.user.getEmail());
				$('#account-settings-email-success').removeClass('hidden');
			} else {
				$('#account-settings-email-success').addClass('hidden');
				$('#account-settings-success').removeClass('hidden');
			}

			// Clear all fields
			for (var i in $fields) $fields[i].val('');			
		});

		return false;
	};

	this.validation = {
		oldPassword: function($field) {
			if (!$field.val().length) {
				$field.addClass('error');
				return false;
			} else {
				$field.removeClass('error');
				return true;
			}
		},

		password: function($field) {
			return this.oldPassword($field);
		},

		password2: function($field) {
			if (!$field.val().length || $field.val() !== $('#password').val()) {
				$field.addClass('error');
				return false;
			} else {
				$field.removeClass('error');
				return true;
			}
		},

		email: function($field) {
			if (!$field.val().length || !/^.+@.+$/.test($field.val())) {
				$field.addClass('error');
				return false;
			} else {
				$field.removeClass('error');
				return true;
			}
		}
	};

	/**
	 * Show the add account pushout panel
	 */
	this.toggleAddAccount = function() {
		$('#settings-add-provider-button').toggleClass('active');
		$('#settings-add-provider-pushout').toggleClass('visible-small');
	};

	/**
	 * Show the "remove" confirmation
	 * @param Element buttonElement
	 */
	this.toggleRemoveOverlay = function(buttonElement) {
		$(buttonElement).parents('li').children('.confirm-deletion').toggleClass('show-deletion');
	};

	/**
	 * Remove a provider
	 * @param String providerId
	 */
	this.removeProvider = function(providerId) {
		app.lib.ui.loader.show();

		app.core.api.delete('/provider/' + providerId, false, function(response) {
			showPage(true);
		});
	};

	/**
	 * Remove a session
	 * @param String token
	 * @param Object element
	 * @param Boolean noAnimation
	 */
	this.removeSession = function(token, element, noAnimation) {
		app.core.api.delete('/user/session/' + token, false, function(response) {
			if (!noAnimation) {
				if (!$('.not-current-session').length) {
					$('#clear-session-button-area').animate({ opacity: 0 }, 300, function() {
						$(this).remove();
					});
				}

				var $parent = $(element).parents('li');

				$parent.animate({ opacity: 0 }, 300);

				setTimeout(function() { $parent.remove(); }, 300);
			}
		});
	};

	/**
	 * Route the data sent from the popup to the callback
	 * @param String provider
	 * @param Array data
	 */
	this.injectProviderData = function(provider, data) {
		app.lib.providers.callback(provider, data, function() {
			showPage(true);
		});
	};

	/**
	 * Clear all sessions
	 * @param Object element
	 */
	this.clearSessions = function(element) {
		$('.not-current-session').each(function() {
			self.removeSession($(this).attr('data-token'), this, true);
		});

		animateClearSessions();
	};

	/**
	 * Animate removal of all sessions, one after one
	 */
	var animateClearSessions = function() {
		var animateIndex = 1;

		$($('.not-current-session').get().reverse()).each(function() {
			var $this = $(this);

			setTimeout(function() {
				$this.animate({ opacity: 0 }, 300, $this.remove);
			}, animateIndex * 150);

			animateIndex++;
		});

		$('#clear-session-button-area').animate({ opacity: 0 }, 300, function() {
			$(this).remove();
		});
	};

	/**
	 * Load and render active sessions
	 */
	var showActiveSessions = function() {
		app.core.api.get('/user/sessions', function(data) {
			if (data && data.sessions && data.sessions.length) {
				data.sessions.sort(function(a, b) {
					return a.lastLogin < b.lastLogin;
				});

				data.sessions[0].currentSession = true;

				for (var i in data.sessions) {
					switch (true) {
						case /(Mac)|(OS X)/i.test(data.sessions[i].platform): data.sessions[i].icon = 'apple'; break;
						case /Windows/i.test(data.sessions[i].platform):
							data.sessions[i].icon = 'windows';

							if (/Windows Server/.test(data.sessions[i].platform)) {
								data.sessions[i].platform = 'Windows 7';
							} else if (/Windows NT/.test(data.sessions[i].platform)) {
								data.sessions[i].platform = 'Windows 8';
							}

							break;
						case /Linux/i.test(data.sessions[i].platform): data.sessions[i].icon = 'linux'; break;
						case /Android/i.test(data.sessions[i].platform): data.sessions[i].icon = 'android'; break;
						case /iPhone/i.test(data.sessions[i].platform): data.sessions[i].icon = 'mobile-phone'; break;
						case /iPad/i.test(data.sessions[i].platform): data.sessions[i].icon = 'tablet'; break;
						case /iOS/i.test(data.sessions[i].platform): data.sessions[i].icon = 'apple'; break;
						default: data.sessions[i].icon = 'question-circle'; break;
					}
				}

				app.core.view.render('pages/settings-sessions', data, '#active-sessions-content');
			}
		});
	};

	/**
	 * Load and show the settings page
	 * @param Boolean ignoreCache
	 */
	var showPage = function(ignoreCache) {
		// Show the loader because getProviders may take some time
		app.lib.ui.loader.show();

		// Get the user's provider accounts
		app.lib.user.getProviders(function(providers) {
			var data = {
				providers: providers,
				email: app.lib.user.getEmail(),
				availableProviders: app.lib.providers.getList(),
				languages: app.config.localization.locales,
				currentLanguage: app.lib.user.getLanguage()
			};

			// Render the view
			app.core.view.render('pages/settings', data, '#main', function() {
				// Done – hide the loader!
				app.lib.ui.loader.hide();

				if (!providers.length) {
					app.lib.ui.modal.show('modals/alpha-warning');
					
					setTimeout(function() {
						$('#settings-add-provider-button').addClass('active');
						$('#settings-add-provider-pushout').addClass('visible-small');
					}, 300);
				} else if ($.cookie('reauthorize')) {
					app.lib.ui.modal.show('modals/generic-oauth-error', {
						provider: app.lib.user.getProvider($.cookie('reauthorize'))
					});

					$('#settings-provider-' + $.cookie('reauthorize')).css('color', '#ccc');

					$.removeCookie('reauthorize', { path: '/' });

					setTimeout(function() {
						$('#settings-add-provider-button').addClass('active');
						$('#settings-add-provider-pushout').addClass('visible-small');
					}, 300);
				} else if ($.cookie('reauthorize-permissions')) {
					app.lib.ui.modal.show('modals/generic-oauth-error-permissions', {
						provider: app.lib.user.getProvider($.cookie('reauthorize-permissions'))
					});

					$('#settings-provider-' + $.cookie('reauthorize-permissions')).css('color', '#ccc');

					$.removeCookie('reauthorize-permissions', { path: '/' });

					setTimeout(function() {
						$('#settings-add-provider-button').addClass('active');
						$('#settings-add-provider-pushout').addClass('visible-small');
					}, 300);
				}

				showActiveSessions();
			});
		}, ignoreCache);
	};

	showPage();
});