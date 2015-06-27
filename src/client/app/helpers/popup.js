/**
 * Prematurely open a popup window that shows the 'loading' page
 * @param String link
 * @return Object window.open
 */
app.helpers.popup = function(link, width, height) {
	if (!width) var width = 600;
	if (!height) var height = 300;

	var top = screen.height/2 - height/2;
	var left = screen.width/2 - width/2;

	var url = (link) ? link : app.config.path + '/loading';
	var popup = window.open(url, 'Connect', 'toolbar=no, location=no, status=no, menubar=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left);
	
	return popup;
};