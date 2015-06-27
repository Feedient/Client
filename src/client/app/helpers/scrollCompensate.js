/**
 * Compensate for scrolling, to prevent the user from being disturbed
 * by new (streamed) items showing up on top, moving the user's scroll vision.
 * @param Object $scrollElement
 * @param Object $newElement
 */
app.helpers.scrollCompensate = function($scrollElement, $newElement) {
	var height = parseInt($newElement.height());
	var scrollStart = parseInt($scrollElement.scrollTop());
	$scrollElement[0].scrollTop = scrollStart + height;
};