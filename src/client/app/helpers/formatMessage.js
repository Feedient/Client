(function() {

/**
 * Escape a string to be used in regular expression without breaking it
 * @param String text
 * @param String flags
 * @param String append
 * @return String
 */
var makeRegex = function(text, flags, append) {
	text = text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
	
	if (append) text += append;

	return new RegExp(text, flags);
};

/**
 * Make the links in the message clickable
 * @param String message
 * @param Object links
 * @return String
 */
var parseLinks = function(message, links) {
    if (!message) {
        return "";
    }

	for (var i in links) {
        if (links[i].shortened_url) {
            message = message.replace(links[i].shortened_url, '<a href="' + links[i].shortened_url + '" target="_blank" class="feed-link" title="' + links[i].expanded_url + '">' + links[i].display_url + '</a>');
        } else {
			message = message.replace(links[i].display_url, '<a href="' + links[i].expanded_url + '" target="_blank" class="feed-link" title="' + links[i].expanded_url + '">' + links[i].display_url + '</a>');
		}
	}

	return message;
};

/**
 * Make the hashtags in the message clickable
 * @param String message
 * @param Object hashtags
 * @return String
 */
var parseHashtags = function(message, hashtags) {
	for (var i in hashtags) {
		message = message.replace(makeRegex('#' + hashtags[i].name, 'ig', '(?![a-zA-Z0-9_<>\.\-])'), '<a href="' + hashtags[i].link + '" target="_blank" class="feed-hashtag">#' + hashtags[i].name + '</a>');
	}

	return message;
};

/**
 * Make the mentions in the message clickable
 * @param String message
 * @param Object mentions
 * @return String
 */
var parseMentions = function(message, mentions) {
	if (/I've arrived/.test(message)) console.log(mentions);
	// Sort by name length DESC to prevent partial matches
	mentions.sort(function(a, b) {
		return b.name.length - a.name.length;
	});

	if (/I've arrived/.test(message)) console.log(mentions);

	for (var i in mentions) {
		message = message.replace(makeRegex(mentions[i].name, 'i', '(?![a-zA-Z0-9_<>\.\-])'), '<a href="' + mentions[i].profile_link + '" target="_blank" class="feed-mention">' + mentions[i].name + '</a>');
	}

	return message;
};

/**
 * Text helper: hides long text and adds 'Show more' if necessary
 * @return String
 */
var limitLength = function(text, providerId, postId) {
	var lines = text.match(/([^\r\n]+)?/g);
  
	if (lines) {
		var totalLines = 0;
		var consecutiveBreaks = 0;
		var characters = 0;
    	var maxChars = 200;
      
		for (var i in lines) {
			characters += lines[i].length;

			if (!lines[i]) {
				consecutiveBreaks++;

				if (consecutiveBreaks <= 2) {
					totalLines++;
				}
			} else {
				consecutiveBreaks = 0;
			}
		}

		if (totalLines > 6 || characters > maxChars) {
		 	var originalText = text;
          	var shortText = text.substr(0, maxChars);
			shortText = shortText.substr(0, Math.min(shortText.length, shortText.lastIndexOf(" ")))
			
          	text = '';
          	text += shortText;			
			text += '<br><a href="javascript:void(0)" onclick="app.lib.user.getProvider(\'' + providerId + '\').actions.show(\'' + postId + '\')" class="hidden-in-overlay">Show more</a><div class="visible-in-overlay">';
			text+= originalText.replace(shortText, '');
			text+= '</div>';
			
		}
	}
	return text;
};

/**
 * Text helper: make the message have clickable links, hashtags etc.
 * @param String message
 * @param Object entities
 * @param String providerId
 * @param String postId
 * @param Boolean noBreakLines
 * @param Boolean expandText
 * @return String
 */
app.helpers.formatMessage = function(message, entities, providerId, postId, noBreakLines, expandText) {
	// Turn new lines into <br>
	if (!noBreakLines) {
		message = message.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1$2<br>');
	}

	if (providerId && postId && !expandText) {
		// Trim the string to [max chars]
		message = limitLength(message, providerId, postId);
	}

	if (entities && entities.links && entities.links.length) {
		message = parseLinks(message, entities.links);
	}

	if (entities && entities.hashtags && entities.hashtags.length) {
		message = parseHashtags(message, entities.hashtags);
	}

	if (entities && entities.mentions && entities.mentions.length) {
		message = parseMentions(message, entities.mentions);
	}

	return message;
};

}());