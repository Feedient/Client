/**
 * Make it possible to re-order columns by dragging them
 * @param Function onMouseUp
 */
app.helpers.draggable = function(onMouseUp) {
	var roomOffset = 20; // The number of pixels from when we start making room
	var startX = 0; // Starting X position of our column
	var posX = 0;
	var columnWidth = 0; // The width of the element that we are dragging
	var startPositionIndex = 0; // The position of the element that we are moving
	var targetElement = null; // The element we are switching place with
	var sourceElement = null; // The element that we are moving
	var elements = $('[data-draggable]'); // The array with all our elements
	var isDragging = false;
	var leftDrop = false;

	/**
	 * Start dragging
	 * @param Object e
	 * @param Object element
	 */
	var handleMouseDown = function(e, element) {
		// Start dragging
		if (!isDragging) {
			// We are dragging
			isDragging = true;

			e.preventDefault(); // Prevent default action

			// Where do we start from, @todo: can this be more simple?
			startPositionIndex = $(element).parent().parent().children('[data-draggable]').indexOf($(element).parent()[0]); // The position in the array of the column which we are dragging

			// Set our sourceElement
			sourceElement = elements.eq(startPositionIndex);
			sourceElement.addClass('dragging');

			// Set the width of the element that we are dragging
			columnWidth = sourceElement.width();

			// Set the start position X
			startX = e.clientX;
		}
	};

	/**
	 * Animate dragging + make room for the new column
	 * @param Object e
	 */
	var handleMouseMove = function(e) {
		// Make sure we are dragging
		if (isDragging) {
			e.preventDefault(); // Prevent default

			// Update the position that we moved the element
			posX = e.clientX - startX;

			// Move the element with css to that position
			moveElement(sourceElement, posX);

			// Get if we are moving right or left
			if (e.clientX  - startX < 0) {
				leftDrop = true;
			} else {
				leftDrop = false;
			}

			// Elements to move based on the Math.floor
			if (columnWidth - Math.abs(posX) - roomOffset <= 0) {
				if (leftDrop) {
					elementToMove = sourceElement.parent().children('[data-draggable]').eq(startPositionIndex - 1);
					sourceElement.insertBefore(elementToMove);
					startPositionIndex--;
				} else {
					elementToMove = sourceElement.parent().children('[data-draggable]').eq(startPositionIndex + 1);
					sourceElement.insertAfter(elementToMove);
					startPositionIndex++;
				}

				// Reset the current element
				moveElement(sourceElement, 0);

				startX = e.clientX;
				posX = e.clientX - startX;
			}
		}
	};

	/**
	 * Stop dragging
	 * @param Object e
	 */
	var handleMouseUp = function(e) {
		// Make sure that we are dragging
		if (isDragging) {
			e.preventDefault(); // Stop default action
			e.stopPropagation(); // Stop redirecting

			// Elements to move based on the Math.floor
			var elementsToMove = Math.abs(Math.floor((posX + roomOffset) / columnWidth));

			// Reset them all
			moveElement(sourceElement, 0);
			sourceElement.removeClass('dragging');

			elements = $('[data-draggable]');

			var providerOrder = [];

			elements.each(function(index) {
				providerOrder.push({
					providerId: $(this).attr('id').replace(/column-/, ''),
					order: index
				});
			});

			onMouseUp(providerOrder);

			// Reset the vars
			isDragging = false;
			startX = 0; // Starting X position of our column
			columnWidth = 0; // The width of the element that we are dragging
			startPositionIndex = 0; // The position of the element that we are moving
			targetElement = null; // The element we are switching place with
			sourceElement = null; // The element that we are moving
			isDragging = false;
			posX = 0;
		}
	};

	var moveElement = function(element, x) {
		var transformValue = 'translate(' + x + 'px, 0)';

		element.css({
			'transform': transformValue,
			'-webkit-transform': transformValue,
			'-moz-transform': transformValue,
			'-ms-transform': transformValue,
			'-mo-transform': transformValue
		});
	};

	var handleBlur = function(e) {
		moveElement(sourceElement, 0);
		sourceElement.removeClass('dragging');
	};

	/**
	 * Bind events to the columns with data-draggable attribute
	 */
	$('[data-draggable] h1').each(function() {
		var self = this;

		$(this).on('mousedown', function(e) {
			// Since e.target always 
			if (!isDragging) {
                handleMouseDown(e, self);
            }
		});
	});

	$('body')
		.on('mouseup', handleMouseUp)
		.on('mousemove', handleMouseMove)
		.on('blur', handleBlur);
};