/**
 * vue-svg-inline-loader v1.0.8 (2018-08-30)
 * Copyright 2018 Oliver Findl
 * @license MIT
 */

"use strict";

/* require all dependencies */
const fs = require("fs");
const path = require("path");
const loaderUtils = require("loader-utils");
const validateOptions = require("schema-utils");
const SVGO = require("svgo");

/* define default options object */
const DEFAULT_OPTIONS = freeze({
	inline: {
		keyword: "svg-inline",
		strict: true
	},
	sprite: {
		keyword: "svg-sprite",
		strict: true
	},
	removeAttributes: ["alt", "src"],
	xhtml: false,
	svgo: { plugins: [ { cleanupAttrs: true } ] }
});

/* define validation schema object for options */
const DEFAULT_OPTIONS_SCHEMA = freeze({
	type: "object",
	properties: {
//		inlineKeyword: { type: "string" }, // deprecated
//		inlineStrict: { type: "boolean" }, // deprecated
//		spriteKeyword: { type: "string" }, // deprecated
//		spriteStrict: { type: "boolean" }, // deprecated
		inline: {
			type: "object",
			properties: {
				keyword: { type: "string" },
				strict: { type:"boolean" }
			},
			additionalProperties: false
		},
		sprite: {
			type: "object",
			properties: {
				keyword: { type: "string" },
				strict: { type:"boolean" }
			},
			additionalProperties: false
		},
		removeAttributes: { type: "array" },
		xhtml: { type: "boolean" },	
		svgo: {
			type: "object",
			properties: {
				plugins: { type: "array" }
			},
			additionalProperties: false
		}
	},
	additionalProperties: false
});

/* define all regular expression patterns */
// const PATTERN_INLINE_KEYWORD; // will be defined dynamically based on keyword from options
// const PATTERN_SPRITE_KEYWORD; // will be defined dynamically based on keyword from options
const PATTERN_VUE_SFC_HTML = /^\s*<template(?:\s+[^>]*lang[\s="']+html["'][^>]*)?>\s*/i;
const PATTERN_TEMPLATE_ROOT_OPEN_TAG = /(<template(?:\s+[^>]*lang[\s="']+html["'][^>]*)?>\s*<[\s\S]+?>)([\s\S]*<\/template>)/i;
const PATTERN_IMAGE_SRC_SVG = /<img\s+[^>]*src[\s="']+([^"']+\.svg)(?:[\?#][^"']*)?["'][^>]*\/?>/gi;
const PATTERN_SVG_CONTENT = /(<svg[^>]*>)([\s\S]*)(<\/svg>)/i;
const PATTERN_SVG_OPEN_TAG = /^<svg/i;
const PATTERN_ATTRIBUTES = /\s*([:@]?[^\s=]+)[\s=]+(?:"([^"]*)"|'([^']*)')?\s*/g;
const PATTERN_ATTRIBUTE_NAME = /^[:@]?[a-z][a-z-]+[a-z]$/i;
const PATTERN_WHITESPACES = /\s+/g;
const PATTERN_TAG = /^<|>$/;
const PATTERN_DEPRECATED_OPTION = /^(inline|sprite)(keyword|strict)$/i;

/* export loader */
module.exports = function(content) {

	/* set cacheable flag */
	this.cacheable && this.cacheable();

	/* save callback reference */
	const callback = this.async();

	/* parse deprecated options */
	let loaderOptions = loaderUtils.getOptions(this) || {};
	Object.keys(loaderOptions).forEach(key => {
		if(PATTERN_DEPRECATED_OPTION.test(key)) {
			let value = loaderOptions[key];
			let matches = key.toLowerCase().match(PATTERN_DEPRECATED_OPTION);
			matches.shift();
			let [ match1, match2 ] = matches;
			loaderOptions[match1] = loaderOptions[match1] || {};
			loaderOptions[match1][match2] = value;
			delete loaderOptions[key];
		}
	});

	/* parse and validate options */
	let options = Object.assign({}, DEFAULT_OPTIONS, loaderOptions);
	options.removeAttributes = options.removeAttributes.map(attribute => attribute.toLowerCase());
	validateOptions(DEFAULT_OPTIONS_SCHEMA, options, "vue-svg-inline-loader");

	/* check if sprites can be used */
	options._sprites = path.extname(this.resourcePath).toLowerCase() === ".vue" && PATTERN_VUE_SFC_HTML.test(content);

	/* validate keywords and define regular expression patterns */
	[options.inline.keyword, options.sprite.keyword].forEach(keyword => {
		if(!PATTERN_ATTRIBUTE_NAME.test(keyword)) {
			throw new Error(`Keyword ${keyword} is not valid.`);
		}
	});
	const PATTERN_INLINE_KEYWORD = new RegExp(`\\s+(?:data-)?${options.inline.keyword}\\s+`, "i");
	const PATTERN_SPRITE_KEYWORD = new RegExp(`\\s+(?:data-)?${options.sprite.keyword}\\s+`, "i");

	/* initialize svgo */
	const svgo = new SVGO(options.svgo);

	/* create empty symbols array */
	let symbols = [];

	/* async replace */
	replace(content, PATTERN_IMAGE_SRC_SVG, async (image, source) => {

		/* check for keyword in strict mode */
		if(options.inline.strict && !PATTERN_INLINE_KEYWORD.test(image)) {
			return image;
		}

		/* make a file object of svg */
		let file = {
			path: loaderUtils.urlToRequest(path.join(this.context, source), "/")
		};
		this.addDependency(path.normalize(file.path));

		/* load file content into file object */
		try {
			file.content = fs.readFileSync(file.path, { encoding: "utf-8" });
		} catch(error) {
			throw new Error(`File ${file.path} does not exist.`);
		}

		/* process file content with svgo */
		try {
			file.content = (await svgo.optimize(file.content, { path: file.path })).data || file.content;
		} catch(error) {
			throw new Error(`SVGO for ${file.path} failed.`);
		}

		/* check if svg content is not empty */
		if(!PATTERN_SVG_CONTENT.test(file.content)) {
			throw new Error(`File ${file.path} is empty.`);
		}

		/* check for keyword in strict mode and handle svg as sprite */
		if(options._sprites && (!options.sprite.strict || PATTERN_SPRITE_KEYWORD.test(image))) {
			file.content = file.content.replace(PATTERN_SVG_CONTENT, (svg, svgOpenTag, symbol, svgCloseTag) => {
				let id = [options.sprite.keyword, path.basename(file.path, ".svg")].join("-");
				symbols.push(`<symbol id="${id}">${symbol}</symbol>`);

			return `${svgOpenTag}<use xlink:href="#${id}"></use>${svgCloseTag}`;
			});
		}

		/* parse attributes */
		let attribute, attributes = [];
		while(attribute = PATTERN_ATTRIBUTES.exec(image)) {
			if(attribute.index === PATTERN_ATTRIBUTES.lastIndex) {
				PATTERN_ATTRIBUTES.lastIndex++;
			}
			if(attribute[1] && !PATTERN_TAG.test(attribute[1]) && PATTERN_ATTRIBUTE_NAME.test(attribute[1])) {
				attributes.push({
					key: attribute[1],
					value: attribute[2] ? attribute[2] : (options.xhtml ? attribute[1] : "")
				});
			}
		}
		PATTERN_ATTRIBUTES.lastIndex = 0;

		/* add role and focusable to attributes if not present */
		let keys = attributes.map(attribute => attribute.key.toLowerCase());
		if(!keys.includes("role")) {
			attributes.push({
				key: "role",
				value: "presentation"
			});
		}
		if(!keys.includes("focusable")) {
			attributes.push({
				key: "focusable",
				value: "false"
			});
		}

		/* add / remove attributes to file content and return it */
		return file.content.replace(PATTERN_SVG_OPEN_TAG, "$& " + attributes.map(attribute => options.removeAttributes.includes(attribute.key.toLowerCase()) ? "" : `${attribute.key}="${attribute.value}"`).join(" ").replace(PATTERN_WHITESPACES, " "));

	}).then(content => {

		/* inject symbols into document */
		if(options._sprites && symbols.length) {

			/* remove duplicate symbols */
			symbols = Array.from(new Set(symbols));

			/* add symbols wrapper */
			symbols.unshift("<div style=\"display: none !important;\"><svg><symbols>");
			symbols.push("</symbols></svg></div>");

			/* return replaced content with symbols injected */
			return callback(null, content.replace(PATTERN_TEMPLATE_ROOT_OPEN_TAG, `$1${symbols.join("")}$2`));

		}

		/* return replaced content */
		return callback(null, content);
	
	}).catch(error => {

		/* return error */
		return callback(error);

	});

};

/* async replace function */
async function replace(string, regex, callback) {
	regex.lastIndex = 0;

	/* get all data */
	let data, promises = [];
	string.replace(regex, (match, ...args) => {
		let promise = callback(match, ...args);
		promises.push(promise);
	});
	data = await Promise.all(promises);

	/* replace all data */
	return data.length ? string.replace(regex, () => data.shift()) : string;
}

/* object deep freeze function */
function freeze(object) {

	/* retrieve the property names defined on object */
	let propNames = Object.getOwnPropertyNames(object);

	/* freeze properties before freezing self */
	for(let name of propNames) {
		let value = object[name];
		object[name] = value && typeof value === "object" ? freeze(value) : value;
	}

	/* return frozen object */
	return Object.freeze(object);
}
