/**
 * Initialize a custom select field
 */
$.fn.selectField = function() {
	'use strict';

	return this.each(function() {
		var $this = $(this);
		var options = '';

		// Has selectField already been run on this element?
		if ($this.attr('data-assigned')) return;

		// Make sure it doesn't get run again
		$this.attr('data-assigned', '1');

		// Set the value
		var $selected = $this.find('.selected');

		if (!$selected.length) {
			$selected = $this.children().first();
		}
		
		$this.attr('data-value', $selected.attr('data-value'));

		$this.prepend('<div class="right"><i class="fa fa-chevron-down"></i></div>');
		var $icon = $($this.find('.right i'));

		// Create a dropdown element
		var $dropdown = $('<div class="select-dropdown hidden"></div>');
		$dropdown.css('width', $this.width() + 'px');

		// Prepare the dropdown
		$this.children().each(function() {
			var $this = $(this);
			if (!$this.hasClass('option')) return;

			options += '<a href="javascript:void(0)" data-value="' + $this.attr('data-value') + '">' + $this.html() + '</a>';
		});

		// Set the dropdown content
		$dropdown.html(options);
		$this.after($dropdown);
	
		var show = function() {
			$dropdown.removeClass('hidden');
			$icon.removeClass('icon-chevron-down').addClass('icon-chevron-up');
		};

		var hide = function() {
			$dropdown.addClass('hidden');
			$icon.removeClass('icon-chevron-up').addClass('icon-chevron-down');
		};

		/**
		 * Handle open/close of select field
		 * @param Object e
		 */
		$this.on('click', function(e) {
			if ($dropdown.hasClass('hidden')) {
				show();
			} else {
				hide();
			}

			e.stopPropagation();

			$('body').off('click');
			$('body').on('click', hide);
		});

		/**
		 * Handle option selection
		 * @param Object e
		 */
		$dropdown.on('click', function(e) {
			hide();

			var value = $(e.target).attr('data-value');

			// UI changes
			$this.find('.selected').removeClass('selected');
			$this.find('[data-value="' + value + '"]').addClass('selected');
			$this.attr('data-value', value);

			$this.trigger('change', value);

			e.stopPropagation();
		});
	});
};