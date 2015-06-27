(function() {
		/**
		* General conditional checker for basic comparators
		*/
		Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
		switch (operator) {
				case '==':
						return (v1 == v2) ? options.fn(this) : options.inverse(this);
				case '===':
						return (v1 === v2) ? options.fn(this) : options.inverse(this);
				case '<':
						return (v1 < v2) ? options.fn(this) : options.inverse(this);
				case '<=':
						return (v1 <= v2) ? options.fn(this) : options.inverse(this);
				case '>':
						return (v1 > v2) ? options.fn(this) : options.inverse(this);
				case '>=':
						return (v1 >= v2) ? options.fn(this) : options.inverse(this);
				case '&&':
						return (v1 && v2) ? options.fn(this) : options.inverse(this);
				case '||':
						return (v1 || v2) ? options.fn(this) : options.inverse(this);
				case '!=':
						return (v1 != v2) ? options.fn(this) : options.inverse(this);
				default:
						return options.inverse(this);
		}
		});

		Handlebars.registerHelper('toUpperCase', function(value) {
			if (value) {
					return new Handlebars.SafeString(value.toLowerCase());
			}

			return '';
		});

		/**
		* Encode text as JSON (stringify)
		* @param String text
		* @return String
		*/ 
		Handlebars.registerHelper('json', function(text) {
			return new Handlebars.SafeString(JSON.stringify(text));
		});

		/**
		* Conditional helper: check if the value of the key in an object is true
		* @param String key
		* @param Object object
		* @param Object options
		*/
		Handlebars.registerHelper('ifValueIsTrue', function(key, object, options) {
			return object[key] ? options.fn(this) : options.inverse(this);
		});

		/**
		 * Get the video target
		 * @param String url
		 */
		Handlebars.registerHelper('getVideoTarget', function(url) {
			// First make sure mp4 is supported
			if (!window.canPlayMp4) {
				window.canPlayMp4 = false;
				var v = document.createElement('video');
				if(v.canPlayType && v.canPlayType('video/mp4').replace(/no/, '')) {
					window.canPlayMp4 = true;
				}
			}

			// Is it a mp4 video?
			if (window.canPlayMp4 && /\.mp4/.test(url)) {
				// Inline video, yay
				return new Handlebars.SafeString('href="javascript:void(0)" onClick="app.lib.ui.inlineVideo(\'' + url + '\', this)"');
			}

			return new Handlebars.SafeString('href="' + url + '" target="_blank"');
		});

		/**
		* Conditional helper: check if the value is a string
		* @param String value
		* @param Object options
		*/
		Handlebars.registerHelper('ifNotString', function(value, options) {
			return (typeof value != 'string') ? options.fn(this) : options.inverse(this);
		});

		/**
		* Conditional helper: check if the user's name should be displayed
		* @param String action
		* @param Object user
		* @param Object options
		*/
		Handlebars.registerHelper('ifShouldShowName', function(action, user, options) {
			if (user.inverse) {
				var options = user;
			} else if (!user.name && !user.name_formatted) {
				return options.inverse(this);
			}

			if (action && action.message && !action.user) {
				return options.inverse(this);
			}

			return options.fn(this);
		});

		/**
		* Conditional helper: check if the image should be small (indented)
		* @param String action
		* @param String message
		* @param Object options
		*/
		Handlebars.registerHelper('ifShouldBeSmallImage', function(action, message, options) {
			if (action && action.type && !action.user) {
					return options.inverse(this);
			} else if (!message || !message.length) {
					return options.inverse(this);
			}

			return options.fn(this);
		});

		/**
		* Conditional helper: check if the picture should be indented
		* @param Object pictures
		* @param Object postContent
		* @param Object options
		*/
		Handlebars.registerHelper('ifPictureShouldBeIntented', function(pictures, postContent, options) {
			if (pictures.length == 1 && postContent.message && pictures[0].caption) {
					return options.fn(this);
			}

			return options.inverse(this);
		});

		/**
		* Text helper: format time in relative form
		* @param String timestamp
		* @return String
		*/
		Handlebars.registerHelper('timeFormat', function(timestamp) {
			return app.helpers.formatTimeAgo(timestamp);
		});

		/**
		* Text helper: get the base domain out of a link
		* @param String link
		* @return String
		*/
		Handlebars.registerHelper('getDomain', function(link) {
			if (!link) return "";
			var domain = link.match(/https?:\/\/(www\.)?([A-Za-z0-9-]+\.?)+/g);

			if (domain && domain.length > 0) {
					return domain[0].replace(/https?:\/\//, '');
			}

			return "";
		});

		/**
		* Get the correct in-feed post action data
		* @param String providerId
		* @param String actionType
		* @param String key
		* @return String
		*/
		Handlebars.registerHelper('actionInfo', function(providerId, actionType, key) {
			var provider = app.lib.user.getProvider(providerId);

			if (provider && provider.actions.types[actionType]) {
					return provider.actions.types[actionType][key];
			}

			return '';
		});

		/**
		* Text helper: automatically detect links and make them clickable
		* @param String message
		* @return String
		*/
		Handlebars.registerHelper('detectLinks', function(message) {
			message = message.replace(/((http|ftp)+(s)?:\/\/[^<>\s]+)/i, '<a href="$1" target="_blank">$1</a>');

			return new Handlebars.SafeString(message);
		});

		/**
		* Get the style for the background image, uses dimensions
		*/
		Handlebars.registerHelper('extractBackgroundImage', function(smallPicture) {
			var style = "";

			if (smallPicture.url && smallPicture.width && smallPicture.height) {
					style = "background-image:url(" + smallPicture.url + "); ";
					style += "width: 350px; "; // Set on 350px, we upscale it to match our feed well

					var scaledHeight = Math.round(((350 / smallPicture.width) * smallPicture.height));
					style += "height: " + scaledHeight + "px; ";
			} else if (smallPicture.url) {
					style = "background-image:url(" + smallPicture.url + "); ";
			} else {
					style = "background-image:url(" + smallPicture + "); ";
			}

			return style;
		});

		/**
		* Check if we got dimensions given or not.
		*/
		Handlebars.registerHelper('parseLargePicture', function(largePicture) {
			if (largePicture && largePicture.url) {
					return largePicture.url;
			}

			return largePicture;
		});

		/**
		* Text helper: make the message have clickable links and newlines
		* @param String message
		* @return Handlebars.SafeString
		*/
		Handlebars.registerHelper('formatDescription', function(message) {
			// Turn new lines into <br>
			message = message.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1$2<br>');

			// todo: linkify!

			return new Handlebars.SafeString(message);
		});

		/**
		* Text helper: make the message have clickable links, hashtags etc.
		* @param String message
		* @param Object entities
		* @param String providerId
		* @param String postId
		* @param Boolean expandText
		* @return Handlebars.SafeString
		*/
		Handlebars.registerHelper('formatMessage', function(message, entities, providerId, postId, expandText) {
			message = app.helpers.formatMessage(message, entities, providerId, postId, false, expandText);

			return new Handlebars.SafeString(message);
		});

		/**
		 * Text helper: remove malicious/heavy content (HTML tags)
		 * @param String message
		 * @return String
		 */
		Handlebars.registerHelper('safeParseMessage', function(message) {
			message = message.replace(/<script.*>.*<\/script>/i, '');
			message = message.replace(/<i?frame.*>.*<\/i?frame>/i, '');
			message = message.replace(/<fieldset.*>.*<\/fieldset>/i, '');
			message = message.replace(/<form.*>.*<\/form>/i, '');
			message = message.replace(/<button.*>.*<\/button>/i, '');
			message = message.replace(/<input.*>/i, '');

			return new Handlebars.SafeString(message);
		});

		/**
		 * Format notification message
		 * @param String message
		 */
		Handlebars.registerHelper('formatNotification', function(message) {
			message = message.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1$2<br>');

			// Make links *look* clickable
			message = message.replace(/(#[a-z0-9_]+)/ig, '<span class="link-placeholder">$1</span>');
			message = message.replace(/(@[a-z0-9_]+)/ig, '<span class="link-placeholder">$1</span>');
			message = message.replace(/(https?:\/\/[a-z0-9-.\/]+)/ig, '<span class="link-placeholder">$1</span>');

			return new Handlebars.SafeString(message);
		});

		Handlebars.registerHelper('formatVideoDescription', function(message, entities, isLightbox) {
			if (!isLightbox) var length = 150;

			// Trim to length
			if (message && length && message.length >= length) {
					// Increase length till we reach a space
					while (length < message.length && message.substr(length, 1) != " ") {
							length++;
					}

					// Substring
					message = message.substr(0, length) + ' ...';
			}

			// Parse links
			if (entities && entities.links && entities.links.length) {
					message = app.helpers.formatMessage(message, entities, false, false, !isLightbox);
			}

			return new Handlebars.SafeString(message);
		});

		Handlebars.registerHelper('shorten', function(message, length) {
			if (message.length >= length) {
					message = message.substr(0, length-3) + '...';
			}

			return message;
		});

		/**
		* Conditional helper: check if a equals b (optionally c equals d and e equals f)
		* @param String a
		* @param String b
		* @param String c
		* @param String d
		* @param String e
		* @param String f
		* @param Object options
		*/
		Handlebars.registerHelper('ifEquals', function(a, b, c, d, e, f, options) {
			if (options) { // a-b c-d e-f: options is options
					return(a == b && c == d && e == f) ? options.fn(this) : options.inverse(this);
			} else if(e) { // a-b c-d options: e is options
					return(a == b && c == d) ? e.fn(this) : e.inverse(this);
			} else { // a-b options: c is options
					return(a == b) ? c.fn(this) : c.inverse(this);
			}
		});

}());