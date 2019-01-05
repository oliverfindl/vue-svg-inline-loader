/**
 * vue-svg-inline-loader v1.2.8 (2019-01-05)
 * Copyright 2019 Oliver Findl
 * @license MIT
 */

"use strict";

/* require all dependencies */
const path = require("path");
const crypto = require("crypto");
const { readFileSync } = require("fs");
const { getOptions } = require("loader-utils");
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
	dataAttributes: [],
	removeAttributes: ["alt", "src"],
	md5: true,
	xhtml: false,
	svgo: { plugins: [ { removeViewBox: false } ] }
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
		dataAttributes: { type: "array" },
		removeAttributes: { type: "array" },
		md5: { type: "boolean" },
		xhtml: { type: "boolean" },	
		svgo: {
			oneOf: [{
				type: "object",
				properties: {
					plugins: { type: "array" }
				},
				additionalProperties: false
			}, {
				type: "boolean"
			}, {
				enum: [null]
			}]
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
const PATTERN_TAG = /^<|>$/;
const PATTERN_DEPRECATED_OPTION = /^(inline|sprite)(keyword|strict)$/i;

/* export loader */
module.exports = function(content) {

	/* set cacheable flag */
	this.cacheable && this.cacheable();

	/* save callback reference */
	const callback = this.async();

	/* parse deprecated options */
	const loaderOptions = getOptions(this) || {};
	const loaderOptionsPropNames = Object.getOwnPropertyNames(loaderOptions);
	for(const name of loaderOptionsPropNames) {
		if(PATTERN_DEPRECATED_OPTION.test(name)) {
			const value = loaderOptions[name];
			const matches = name.toLowerCase().match(PATTERN_DEPRECATED_OPTION);
			const [ match1, match2 ] = matches.slice(1);
			merge(loaderOptions, {
				arrayConcat: false,
				arrayUnique: false,
				overwrite: false,
				skipUndefined: true
			}, {
				[match1]: {
					[match2]: value
				}
			});
			delete loaderOptions[name];
		}
	}

	/* parse and validate options */
	const options = merge({}, {
		arrayConcat: false,
		arrayUnique: false,
		overwrite: true,
		skipUndefined: true
	}, DEFAULT_OPTIONS, loaderOptions);
	options.removeAttributes = options.removeAttributes.map(attribute => attribute.toLowerCase());
	validateOptions(DEFAULT_OPTIONS_SCHEMA, options, "vue-svg-inline-loader");

	/* check if SVGO can be used */
	options._svgo = !!options.svgo;

	/* check if sprites can be used */
	options._sprites = !!(path.extname(this.resourcePath).toLowerCase() === ".vue" && PATTERN_VUE_SFC_HTML.test(content));

	/* validate keywords and define regular expression patterns */
	for(const keyword of [options.inline.keyword, options.sprite.keyword]) {
		if(!PATTERN_ATTRIBUTE_NAME.test(keyword)) {
			throw new Error(`Keyword ${keyword} is not valid.`);
		}
	}
	const PATTERN_INLINE_KEYWORD = new RegExp(`\\s+(?:data-)?${options.inline.keyword}\\s+`, "i");
	const PATTERN_SPRITE_KEYWORD = new RegExp(`\\s+(?:data-)?${options.sprite.keyword}\\s+`, "i");

	/* initialize svgo */
	const svgo = options._svgo && new SVGO(options.svgo === true ? DEFAULT_OPTIONS.svgo : options.svgo);

	/* create empty symbols set */
	const symbols = new Set();

	/* async replace */
	replace(content, PATTERN_IMAGE_SRC_SVG, async (image, source) => {

		/* check for keyword in strict mode */
		if(options.inline.strict && !PATTERN_INLINE_KEYWORD.test(image)) {
			return image;
		}

		/* resolve path of svg file */
		const filePath = await new Promise((resolve, reject) => {
			this.resolve(this.context, source, (error, resolvedPath) => {
				if(error) {
					reject(error);
				}

				resolve(resolvedPath);
			});
		});

		/* create a file object of svg */
		const file = { path: filePath };
		this.addDependency(path.normalize(file.path));

		/* load file content into file object */
		try {
			file.content = readFileSync(file.path, { encoding: "utf-8" });
		} catch(error) {
			throw new Error(`File ${file.path} does not exist.`);
		}

		/* check if svg content is not empty */
		if(!PATTERN_SVG_CONTENT.test(file.content)) {
			throw new Error(`File ${file.path} is empty.`);
		}

		/* process file content with svgo */
		try {
			file.content = options._svgo && (await svgo.optimize(file.content, { path: file.path })).data || file.content;
		} catch(error) {
			throw new Error(`SVGO for ${file.path} failed.`);
		}

		/* check for keyword in strict mode and handle svg as sprite */
		if(options._sprites && (!options.sprite.strict || PATTERN_SPRITE_KEYWORD.test(image))) {
			file.content = file.content.replace(PATTERN_SVG_CONTENT, (svg, svgOpenTag, symbol, svgCloseTag) => {
				const developmentId = [this.resourcePath, file.path].map(path => path.replace(this.rootContext, "")).join(":");
				const id = [options.sprite.keyword, options.md5 ? crypto.createHash("md5").update(developmentId).digest("hex") : developmentId].join(options.md5 ? "-" : ":");
				symbols.add(`<symbol id="${id}">${symbol}</symbol>`); // .has() is not neccessary

				return `${svgOpenTag}<use xlink:href="#${id}"></use>${svgCloseTag}`;
			});
		}

		/* create empty attributes map */
		const attributes = new Map();

		/* parse attributes */
		let attribute;
		PATTERN_ATTRIBUTES.lastIndex = 0;
		while(attribute = PATTERN_ATTRIBUTES.exec(image)) {
			if(attribute.index === PATTERN_ATTRIBUTES.lastIndex) {
				PATTERN_ATTRIBUTES.lastIndex++;
			}
			if(attribute[1] && !PATTERN_TAG.test(attribute[1]) && PATTERN_ATTRIBUTE_NAME.test(attribute[1])) {
				attributes.set(attribute[1].toLowerCase(), (attribute[2] ? attribute[2] : (options.xhtml ? attribute[1] : "").toLowerCase()));
			}
		}

		/* add role and focusable to attributes if not present */
		if(!attributes.has("role")) {
			attributes.set("role", "presentation");
		}
		if(!attributes.has("focusable")) {
			attributes.set("focusable", "false");
		}

		/* transform attributes to data-attributes */
		for(const attribute of options.dataAttributes) {
			if(attributes.has(attribute)) {
				attributes.set(`data-${attribute}`, attributes.get(attribute));
				attributes.delete(attribute);
			}
		}

		/* remove unwanted attributes */
		for(const attribute of options.removeAttributes) {
			attributes.delete(attribute); // .has() is not neccessary
		}

		/* inject attributes to file content if available and return it */
		return attributes.size ? file.content.replace(PATTERN_SVG_OPEN_TAG, "$& " + [...attributes.keys()].map(attribute => `${attribute}="${attributes.get(attribute)}"`).join(" ")) : file.content;

	}).then(content => {

		/* inject symbols into file content if available and return it */
		return callback(null, options._sprites && symbols.size ? content.replace(PATTERN_TEMPLATE_ROOT_OPEN_TAG, `$1<div style=\"display: none !important;\"><svg><symbols>${[...symbols].join("")}</symbols></svg></div>$2`) : content);
	
	}).catch(error => {

		/* return error */
		return callback(error);

	});

};

/* async replace function */
async function replace(string, regex, callback) {
	regex.lastIndex = 0;

	/* get all data */
	const promises = [];
	string.replace(regex, (match, ...args) => {
		const promise = callback(match, ...args);
		promises.push(promise);
	});
	const data = await Promise.all(promises);

	/* replace all data */
	return data.length ? string.replace(regex, () => data.shift()) : string;
}

/* object deep freeze function */
function freeze(object) {

	/* retrieve the property names defined on object */
	const propNames = Object.getOwnPropertyNames(object);

	/* recursively freeze properties before freezing self */
	for(const name of propNames) {
		const value = object[name];
		object[name] = value && typeof value === "object" ? freeze(value) : value;
	}

	/* return frozen object */
	return Object.freeze(object);
}

/*  object deep merge function */
function merge(object, options, ...sources) {

	/* iterate through all provided sources */
	for(const source of sources) {

		/* retrieve the property names defined on object */
		const propNames = Object.getOwnPropertyNames(source);

		/* recursively merge properties */
		for(const name of propNames) {
			const value = source[name];

			/* skip undefined values */
			if(options && options.skipUndefined && value === undefined) {
				continue;
			}

			/* skip if both values equals */
			if(value === object[name]) {
				continue;
			}

			/* merge based on options */
			if(value && typeof value === "object") {
				if(options && options.arrayConcat && Array.isArray(object[name]) && Array.isArray(value)) {
					object[name] = object[name].concat(value);
					if(options && options.arrayUnique) {
						object[name] = Array.from(new Set(object[name]));
					}
				} else if(Array.isArray(value)) {
					object[name] = options && options.overwrite || object[name] === undefined ? value : object[name];
				} else {
					object[name] = merge(object[name] || {}, options, value);
				}
			} else {
				object[name] = options && options.overwrite || object[name] === undefined ? value : object[name];
			}

		}

	}

	/* return merged object */
	return object;
}
