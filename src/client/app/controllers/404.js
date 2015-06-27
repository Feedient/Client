app.core.router.error(function() {
	app.lib.ui.loader.hide();
	app.core.view.render('pages/404');
});