"use strict";

module.exports = {
	"plugins": [
		"@babel/plugin-transform-runtime"
	],
	"presets": [
		[
			"@babel/preset-env",
			{
				"useBuiltIns": "usage",
				"corejs": 2
			}
		]
	],
	"only": [
		"src/*.js"
	],
	"minified": true,
	"comments": false
};
