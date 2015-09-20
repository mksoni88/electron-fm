global.$ = $;

var remote = require('remote');
var Menu = remote.require('menu');
var BrowserWindow = remote.require('browser-window');
var MenuItem = remote.require('menu-item');
var shell = require('shell');

var abar = require('address_bar');
var folder_view = require('folder_view');

// $('title').text('hi there');

// append default actions to menu for OSX
var initMenu = function() {
	try {
		var nativeMenuBar = new Menu();
		if (process.platform == "darwin") {
			if (nativeMenuBar.createMacBuiltin) nativeMenuBar.createMacBuiltin("FileExplorer");
		}
	} catch (error) {
		console.error(error);
		setTimeout(function() {
			throw error;
		}, 1);
	}
};

var aboutWindow = null;
var App = {
	// show "about" window
	about: function() {
		var params = {
			toolbar: false,
			resizable: false,
			show: true,
			height: 150,
			width: 400
		};
		aboutWindow = new BrowserWindow(params);
		aboutWindow.loadUrl('file://' + __dirname + '/about.html');
	},

	// change folder for sidebar links
	cd: function(anchor) {
		anchor = $(anchor);

		$('#sidebar li').removeClass('active');
		$('#sidebar i').removeClass('icon-white');

		anchor.closest('li').addClass('active');
		anchor.find('i').addClass('icon-white');

		this.setPath(anchor.attr('nw-path'));
	},

	// set path for file explorer
	setPath: function(path) {
		if (path.indexOf('~') === 0) {
			path = path.replace('~', process.env.HOME);
		}
		this.folder.open(path);
		this.addressbar.set(path);
	}
};

$(document).ready(function() {
	initMenu();

	var folder = new folder_view.Folder($('#files'));
	var addressbar = new abar.AddressBar($('#addressbar'));

	folder.open('/home/mukesh/');
	addressbar.set('/home/mukesh/');

	App.folder = folder;
	App.addressbar = addressbar;

	folder.on('navigate', function(dir, mime) {
		if (mime.type == 'folder') {
			addressbar.enter(mime);
		} else {
			shell.openItem(mime.path);
		}
	});

	addressbar.on('navigate', function(dir) {
		folder.open(dir);
	});

	// sidebar favorites
	$('[nw-path]').bind('click', function(event) {
		event.preventDefault();
		App.cd(this);
	});
	initTypeAhead();
});

function initTypeAhead() {
	var substringMatcher = function(strs) {
		return function findMatches(q, cb) {
			var matches, substringRegex;
			matches = [];
			// regex used to determine if a string contains the substring `q`
			substrRegex = new RegExp(q, 'i');

			// iterate through the pool of strings and for any string that
			// contains the substring `q`, add it to the `matches` array
			$.each(strs, function(i, str) {
				if (substrRegex.test(str)) {
					matches.push(str);
				}
			});

			cb(matches);
		};
	};

	var quickJumpList = [ ];

	var typeahead_elem = $('#the-basics .typeahead');
	typeahead_elem.typeahead({
		hint: true,
		highlight: true,
		autoselect: true,
		minLength: 0
	}, {
		name: 'quickJumpList',
		source: substringMatcher(quickJumpList)
	});


	$('body').on('keydown', function(e) {
		e.preventDefault();
		if (e.ctrlKey && event.which == 80) // ctrl-p
			typeahead_elem.focus();


		if (e.which == 40 || e.which == 38) {
			var current = $(this).find('.focus');
			if (e.which == 40) {
				newelem = current.next();
			} else if (e.which == 38) {
				newelem = current.prev();
			}
			if (newelem.length > 0) {
				newelem.addClass('focus');
				current.removeClass('focus');
				newelem.scrollintoview();
			}
		}
	});

	typeahead_elem.bind('focus', function() {
		$(this).val('');
	});
	typeahead_elem.bind('typeahead:selected', function(obj, datum, name) {
		App.setPath($(this).val());
		$(this).blur();
	});
}
