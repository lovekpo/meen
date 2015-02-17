'use strict';

module.exports = {
	app: {
		title: 'MEEN.JS',
		description: 'Full-Stack JavaScript with MySQL, Express, ExtJS, and Node.js',
		keywords: 'mysql, express, extjs, node.js'
	},
	port: process.env.PORT || 3000,
	templateEngine: 'swig',
	// The secret should be set to a non-guessable string that
	// is used to compute a session hash
	sessionSecret: 'MEEN',
	// The name of the MongoDB collection to store sessions in
	sessionCollection: 'sessions',
	// The session cookie settings
	sessionCookie: { 
		path: '/',
		httpOnly: true,
		// If secure is set to true then it will cause the cookie to be set
		// only when SSL-enabled (HTTPS) is used, and otherwise it won't
		// set a cookie. 'true' is recommended yet it requires the above
		// mentioned pre-requisite.
		secure: false,
		// Only set the maxAge to null if the cookie shouldn't be expired
		// at all. The cookie will expunge when the browser is closed.
		maxAge: null,
		// To set the cookie in a specific domain uncomment the following 
		// setting:
		// domain: 'yourdomain.com'
	},
	// The session cookie name
	sessionName: 'connect.sid',
	log: {
		// Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
		format: 'combined',
		// Stream defaults to process.stdout
		// Uncomment to enable logging to a log on the file system
		options: {
			stream: 'access.log'
		}
	},
	assets: {
		lib: {
			css: [
			],
			js: [
				'public/ext/build/*.js'
			]
		},
		css: [
			'public/resource/**/styles/*.css'
		],
		js: [
			'public/app.js',
			'public/bootstrap.js',
			'public/app/*/*.js',
		],
		tests: [
			'public/*/tests/*.js'
		]
	}
};
