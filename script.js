global.$ = $;

global.quickJumpList = [];
var remote = require('remote');
var Menu = remote.require('menu');
var BrowserWindow = remote.require('browser-window');
var MenuItem = remote.require('menu-item');
var path = remote.require('path');
var shell = require('shell');

var abar = require('address_bar');
var folder_view = require('folder_view');
var mime = remote.require('mime');


// adds an element to the array if it does not already exist using a comparer
// function
Array.prototype.pushUnique = function(element) {
	if (this.indexOf(element) === -1) {
		this.push(element);
	}
};



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

		quickJumpList.pushUnique(path);
		this.folder.open(path);
		this.addressbar.set(path);
	}
};

$(document).ready(function() {
	initMenu();

	var folder = new folder_view.Folder($('#files'));
	var addressbar = new abar.AddressBar($('#addressbar'));

	userhome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
	folder.open(userhome);
	addressbar.set(userhome);

	App.folder = folder;
	App.addressbar = addressbar;


	folder.on('navigate', function(dir, mime) {
		$('#context_dropdown').hide();
		if (mime.type == 'folder') {
			console.log(JSON.stringify(mime));
			quickJumpList.pushUnique(mime.path);
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

	$('body').on('keydown', function(e) {
		if (e.ctrlKey) {
			switch (e.which) {
				case 80:
					e.preventDefault();
					typeahead_elem.focus();
					break;
				case 67:
					// emit event
					e.preventDefault();
					console.log('copy...');
					break;
				default:

			}
		}

		// make sure that tt menu is not active FIXME
		var current = $(this).find('.focus');
		var file_path = current.attr('data-path');

		var newelem = [];
		if (e.which == 40) {
			newelem = current.next();
		} else if (e.which == 38) {
			newelem = current.prev();
		} else if (e.which == 13) { //enter
			folder.emit('navigate', file_path, mime.stat(file_path));
		}

		if (newelem.length > 0) {
			e.preventDefault();
			newelem.addClass('focus');
			current.removeClass('focus');
			newelem.scrollintoview();
		}
	});

	attachDragger();


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


	var typeahead_elem = $('#the-basics .typeahead');
	typeahead_elem.typeahead({
		hint: true,
		highlight: true,
		autoselect: true,
		minLength: 0,

	}, {
		name: 'quickJumpList',
		source: substringMatcher(quickJumpList),

		templates: {
			empty: [
				'<div class="empty-message">',
				'unable to find any matches',
				'</div>'
			].join('\n'),

			suggestion: function(data) {
				var jsonpath = path.parse(data);
				return '<div style="border-bottom:solid 1px #AAA;"><strong> ' + jsonpath.base + '</strong><br><span class="small">' + path.join(jsonpath.dir,jsonpath.base)+ '</span>  </div>';
			}
		},

	});


	typeahead_elem.bind('focus', function() {
		$(this).val('');
	});
	typeahead_elem.bind('typeahead:selected', function(obj, datum, name) {
		App.setPath($(this).val());
		$(this).blur();
	});

}

function attachDragger() {
	// dragula({
	// 	containers: [document.getElementById('taskstack'), document.getElementById('files')],
	// 	copy: true
	// });
}
