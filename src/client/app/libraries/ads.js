app.lib.ads = function() {
	var handler;

	// Set up items
	var items = {
		'1' : {
			description: 'Ad-free for 1 month',
			price: 99,
			endpoint: '/payment/remove_ads/one_month'
		},

		'3' : {
			description: 'Ad-free for 2 months (save 33%)',
			price: 199,
			endpoint: '/payment/remove_ads/three_months'
		},

		'6' : {
			description: 'Ad-free for 6 months (save 50%)',
			price: 299,
			endpoint: '/payment/remove_ads/six_months'
		},

		'x' : {
			description: 'Ad-free forever',
			price: 899,
			endpoint: '/payment/remove_ads/lifetime'
		},
	}; 

	var paymentItem = false;

	/**
	 * Show the remove ads modal
	 */
	this.showRemoveAds = function() {
		// Render modal
		app.lib.ui.modal.show('modals/remove-ads', false, false, function() {
			// UI bindings and shit
			$('#ad-plans li').on('click', function() {
				$('#ad-plans .selected input[type="radio"]').prop('checked', false);
				$('#ad-plans .selected').removeClass('selected');
				$(this).addClass('selected');
				$(this).find('input[type="radio"]').prop('checked', true);
			});

			$('#ad-plans li input[type="radio"]').on('change', function() {
				$('#ad-plans .selected').removeClass('selected');
				$(this).parents('li').addClass('selected');
			});

			$('#payment-button').on('click', function() {
				var value = $('.selected input[type="radio"]').val();
				paymentItem = value;

				// Open stripe modal
				handler.open({
					name: 'Remove ads',
					description: items[value].description,
					amount: items[value].price,
					currency: 'EUR',
					opened: app.lib.ui.modal.hide
				});
			});
		});
	};

	/**
	 * Display the ads (if supposed to)
	 */
	var showAds = function() {
		// Don't show ads at all on screens smaller than 1200px (width)
		if (window.innerWidth < 1200) return;

		if (app.lib.user.getRole() == 'USER_AD_FREE') return;

		app.core.view.render('pages/ads', false, function(HTML) {
			$('#ads').html(HTML).show();

			setTimeout(function() {
				$('#main').css({right: '200px'});
			}, 300);
		});
	};

	/**
	 * Process the payment
	 * @param Object token
	 */
	var processPayment = function(token) {
		$('#ads').hide();
		$('#main').css({right: '0px'});

		app.core.api.post(items[paymentItem].endpoint, { stripeToken: token.id }, function(data) {
			if (data.err) {
				app.lib.ui.modal.show('modals/payment-error', data.err.message);

				$('#ads').show();
				$('#main').css({right: '200px'});
			}
		});
	}

	app.core.hooks.on('loaded', function(data, next) {
		handler = StripeCheckout.configure({
			key: 'pk_test_M1omeRcks9x2gXpAG15KBDL4',
			image: app.config.path + '/images/logo_square.png',
			email: app.lib.user.getEmail(),
			token: processPayment
		});

		next(data);
	});

	app.core.hooks.on('ready', function(data, next) {
		if (app.config.ads) {
			setTimeout(showAds, 1000);
		}

		next(data);
	});

	app.core.hooks.on('route', function(data, next) {
		handler.close();
		next(data);
	});
};