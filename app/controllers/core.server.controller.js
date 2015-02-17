'use strict';

/**
 * Module dependencies.
 */

var Autowire = require('wantsit').Autowire,
    _db = Autowire;

exports.index = function(req, res) {
	res.render('index', {
		user: req.user || null,
		request: req
	});
};
