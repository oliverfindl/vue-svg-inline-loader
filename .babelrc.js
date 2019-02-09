"use strict";

module.exports = {
    "plugins": [
		"@babel/plugin-transform-runtime"
	],
	"presets": [
		[
			"@babel/preset-env",
			{
				"useBuiltIns": "usage"
			}
		]
	],
	"only": [
		"src/*.js"
	],
	"minified": true,
	"comments": false
};