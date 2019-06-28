"use strict";

module.exports = {
  "plugins": [
		[
			"@babel/plugin-transform-runtime",
		 	{
				"regenerator": true
			}
		]
	],
	"presets": [
		[
			"@babel/preset-env",
			{
				"useBuiltIns": "entry",
				"corejs": 3
			}
		]
	],
	"only": [
		"src/*.js"
	],
	"comments": false
};
