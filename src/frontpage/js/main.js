(function() {
	'use strict';

	// AutoLogin
	if ($.cookie('token')) {
		$('#signup-bottom-button').hide();
		$('#logged-out').hide();
		$('#logged-in').show();

		// If we did not select the homepage, then redirect to /app automatically
		if (!$.cookie('home') && ['/', '/index'].indexOf(window.location.pathname) !== -1) window.location = '/app';
	}

	$(document).ready(function() {
		if (window.location.hash && /#invite\/[a-z0-9]+/i.test(window.location.hash)) {
			var key = window.location.hash.replace(/#invite\//, '');
			var $keyElement = $('#invitation-key');

			if ($keyElement) {
				$keyElement.val(key);
				$keyElement.css({
					border: '1px solid #1ead91',
					color: '#1ead91',
					fontWeight: 'bold'})
					.attr('readonly', 'readonly');

				showModal(false, 'signup');
			}
		}

		$('#contact_cause').on('change', function() {
			if (this.value == 'CONTACT_CAUSE_SUGGESTIONS') {
				$('#suggestions').show();
				$('#form-bottom').hide();
			} else {
				$('#suggestions').hide();
				$('#form-bottom').show();
			}
		});
	});

	var localizedStrings = {
		errors: {
			ACCOUNT_NOT_FOUND: 'There is no account with this email address.',
			ACCOUNT_PASSWORD_INCORRECT: 'The password was incorrect.',
			ACCOUNT_EMAIL_EXISTS: 'There is already an account with this email address.',
		}
	};

	/**
	 * Basic client-side workaround to handle i18n messages.
	 * Front page only supports English right now.
	 * @param String key
	 * @return String
	 */
	var i18n = function(key) {
		var parts = key.split('.');

		// Check for namespace.key format
		if (parts.length != 2) {
			return key;
		}

		// Check if translation exists
		if (localizedStrings[parts[0]] && localizedStrings[parts[0]][parts[1]]) {
			return localizedStrings[parts[0]][parts[1]];
		}

		return key;
	};

	/**
	 * Show the modal and set the active state of the link
	 * @param MouseEvent e
	 * @param String id
	 */
	var showModal = function(e, id) {
		if (typeof id == 'undefined') {
			var id = ($(this).hasClass('action-login')) ? 'login' : 'signup';
		}

		window.scrollTo(0, 0);

		$('.show-modal').removeClass('show-modal');
		$('#' + id + '-modal').addClass('show-modal');
		$('.modal-bg').show().animate({ opacity: 0.6 }, 500);
		$('#' + id + '-button').addClass('modal-active');

		$('#' + id + '-email').focus();
	};

	/**
	 * Hide the modal and reset the active state
	 */
	window.hideModal = function() {
		$('.modal-active').removeClass('modal-active');
		$('.show-modal').removeClass('show-modal');
		$('.modal-bg').hide().css({ opacity: 0 });
		window.resetLoginForm();
	};

	$('.action-signup, .action-login').on('click', showModal);
	$('.modal-bg').on('click', window.hideModal);

	/**
	 * Log in and set the token cookie
	 * @param String email
	 * @param String password
	 * @param Function callback
	 */
	var login = function(email, password, callback) {
		$.ajax({
			url: window.API + '/user/authorize',
			type: 'POST',
			data: { email: email, password: password },
			success: function(response) {
				if (!response.error) {
					$.cookie('token', response.token, { expires: 365, path: '/' });
				}

				callback(response.error);
			},
			error: function(error) {
				showModal(false, 'offline');
			}
		});
	};

	/**
	 * Get the form data
	 * @param Element $formError
	 * @param String id
	 * @return Array
	 */
	var getFormData = function($formError, id) {
		$formError.html('');

		var data = {
			email: $('#' + id + '-email').val(),
			password: $('#' + id + '-password').val()
		};

		if (id == 'signup' && $('#invitation-key')) {
			data.key = $('#invitation-key').val();
		}

		if (!data.email || !data.password) {
			$formError.html('<div class="bottom-error">You must enter an email and a password</div>');
			return false;
		}

		return data;
	}

	/**
	 * Sign up submission
	 */
	$('#signup-form').on('submit', function(e) {
		var $formError = $('#signup-form-error');
		var data = getFormData($formError, 'signup');

		if (!data) return false;

		if (!$('#signup-terms')[0].checked) {
			$formError.html('<div class="bottom-error">You must accept the Terms of Service</div>');
			return false;
		}

		$formError.html('<div class="loading"></div>');

		$.ajax({
			url: window.API + '/user',
			type: 'POST',
			data: data,
			success: function(response) {
				if (!response.error) {
					login(data.email, data.password, function(error) {
						if (!error) {
							window.location = './app';
						}
					});
				} else {
					$formError.html('<div class="bottom-error">' + i18n(response.error) + '</div>');
				}
			},
			error: function(xhr) {
				if (xhr.status == 400) {
					var response = JSON.parse(xhr.responseText);

					response.message = response.message.charAt(0).toUpperCase() + response.message.slice(1);

					$formError.html('<div class="bottom-error">' + response.message + '</div>');

					return;
				}

				$formError.html('');
				showModal(false, 'offline');
			}
		});

		return false;
	});

	/**
	 * Log in submission
	 */
	$('#login-form').on('submit', function(e) {
		var $formError = $('#login-form-error');
		var data = getFormData($formError, 'login');

		if (!data) return false;

		$formError.html('<div class="loading"></div>');

		login(data.email, data.password, function(error) {
			if (error) {
				$formError.html('<div class="bottom-error">' + i18n(error) + '</div>');
			} else {
				window.location = './app';
			}
		});

		return false;
	});


	/**
	 * Recover password submission
	 */
	$('#reset-form').on('submit', function(e) {
		var $formError = $('#reset-form-error');
		$formError.html('<div class="loading"></div>');

		var email = $('#reset-email').val();
		if (!email) return;

		$.ajax({
			url: window.API + '/user/recover',
			type: 'POST',
			data: { email: email },
			success: function(response) {
				if (response.error) {
					$formError.html('<div class="bottom-error">' + i18n(response.error) + '</div>');
					return;
				}

				$formError.html('<div style="margin-top:20px;color:#333;text-align:center;font-size:12px;font-weight:bold;">We have sent you an email with further instructions.</div>');
			},
			error: function() {
				$formError.html('');
				showModal(false, 'offline');
			}
		});

		return false;
	});

	var submittingContact = false;

	/**
	 * Submit the contact form
	 */
	$('#contact-form').on('submit', function() {
		if (submittingContact) return false;

		submittingContact = true;

		if ($.cookie('sentMail')) {
			$('#contact-error').html('You may only send one email per day, due to our spam policy.');
			return false;
		}

		var $formError = $('#contact-error');

		var postData = {
			name: $('#contact_name').val(),
			email: $('#contact_email').val(),
			cause: $('#contact_cause').val(),
			message: $('#contact_message').val()
		};

		for (var i in postData) {
			if (!postData[i].length) {
				$formError.html('The fields can\'t be empty');
				submittingContact = false;
				return false;
			}
		}

		$formError.html('<div class="loading" style="margin-top:0px;"></div>');

		$.ajax({
			url: window.API + '/contact',
			type: 'POST',
			data: postData,
			success: function(response) {
				submittingContact = false;
				if (response.success) {
					$('#contact_name').val('');
					$('#contact_email').val('');
					$('#contact_cause').val('CONTACT_CAUSE_SUPPORT');
					$('#contact_message').val('');

					$formError.html('Thanks for your email. We will reply as soon as possible.');
					$.cookie('sentMail', '1', { path: '/', expires: 1 });
				} else {
					$formError.html('Something went wrong, please try again');
				}
			},
			error: function() {
				submittingContact = false;
				$formError.html('');
				showModal(false, 'offline');
			}
		});

		return false;
	});

	window.resetPassword = function() {
		$('#reset-form').show();
		$('#login-form').hide();
	};

	window.resetLoginForm = function() {
		$('#reset-form').hide();
		$('#login-form').show();
	};
}());