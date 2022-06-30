/**
 * @author Oliver Findl
 * @version 2.1.5
 * @license MIT
 */

"use strict";

/* require all dependencies */
const path = require("path");
const crypto = require("crypto");
const { readFileSync } = require("fs");
const { getOptions } = require("loader-utils");
const { validate: validateOptions } = require("schema-utils");
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
	addTitle: false,
	cloneAttributes: ["viewbox"],
	addAttributes: {
		role: "presentation",
		focusable: false,
		tabindex: -1
	},
	dataAttributes: [],
	removeAttributes: ["alt", "src"],
	transformImageAttributesToVueDirectives: true,
	md5: true,
	xhtml: false,
	svgo: { plugins: [ { removeViewBox: false } ] },
	verbose: false
});

/* define validation schema object for options */
const DEFAULT_OPTIONS_SCHEMA = freeze({
	type: "object",
	properties: {
		// inlineKeyword: { type: "string" }, // deprecated
		// inlineStrict: { type: "boolean" }, // deprecated
		// spriteKeyword: { type: "string" }, // deprecated
		// spriteStrict: { type: "boolean" }, // deprecated
		inline: {
			type: "object",
			properties: {
				keyword: { type: "string" },
				strict: { type: "boolean" }
			},
			additionalProperties: false
		},
		sprite: {
			type: "object",
			properties: {
				keyword: { type: "string" },
				strict: { type: "boolean" }
			},
			additionalProperties: false
		},
		addTitle: { type: "boolean" },
		cloneAttributes: { type: "array" },
		addAttributes: { type: "object" },
		dataAttributes: { type: "array" },
		removeAttributes: { type: "array" },
		transformImageAttributesToVueDirectives: { type: "boolean" },
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
		},
		verbose: { type: "boolean" }
	},
	additionalProperties: false
});

/* define all regular expressions */
// const REGEXP_INLINE_KEYWORD; // will be defined dynamically based on keyword from options
// const REGEXP_SPRITE_KEYWORD; // will be defined dynamically based on keyword from options
const REGEXP_VUE_SFC_HTML = /^\s*<template(?:\s+[^>]*lang[\s="']+html["'][^>]*)?>\s*/i;
const REGEXP_BEFORE_ROOT_CLOSE_TAG = /(<template[^>]*>[\s\S]+)(\s*<\/[^>]+>[\s\S]*<\/template>)/i;
const REGEXP_IMAGE_SRC_SVG = /(["']|#|`{3})?<img\s+[^>]*src[\s="']+([^"']+\.svg)(?:[?#][^"']*)?["'][^>]*\/?>(["']|#|`{3})?/gi;
// const REGEXP_SVG_WHITESPACE = /((?:\r?\n)+|\t+|  +)/g;
// const REGEXP_SVG_WHITESPACE_TAGS = />\s+</g;
const REGEXP_SVG_CONTENT = /<svg(\s+[^>]+)?>([\s\S]+)<\/svg>/i;
const REGEXP_SVG_TITLE = /<svg[^>]*>[\s\S]*(<title>[\s\S]*<\/title>)[\s\S]*<\/svg>/i;
const REGEXP_SVG_TAG = /^<svg[^>]*/i;
const REGEXP_USE_TAG = /<use[^>]*/i;
const REGEXP_ATTRIBUTES = /\s*([:@]?[^\s=]+)[\s=]+(?:"([^"]*)"|'([^']*)')?\s*/g;
const REGEXP_ATTRIBUTE_NAME = /^[:@]?[a-z](?:[a-z0-9-:.]*[a-z0-9])?$/i;
const REGEXP_ATTRIBUTE_NAME_VUE = /^([:@]|v-).+$/i;
const REGEXP_TAG = /^<|>$/;
const REGEXP_DEPRECATED_OPTION = /^(inline|sprite)(keyword|strict)$/i;

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
		if(REGEXP_DEPRECATED_OPTION.test(name)) {
			const value = loaderOptions[name];
			const matches = name.toLowerCase().match(REGEXP_DEPRECATED_OPTION);
			merge(loaderOptions, {
				arrayConcat: false,
				arrayUnique: false,
				overwrite: false,
				skipUndefined: true
			}, {
				[matches[1]]: {
					[matches[2]]: value
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
	["cloneAttributes", "dataAttributes", "removeAttributes"].forEach(option => {
		options[option] = options[option].map(attribute => attribute.toLowerCase());
		options[option].forEach(attribute => {
			[":", "@"].forEach(shorthand => {
				options[option].push(shorthand + attribute);
			});
		});
	});
	validateOptions(DEFAULT_OPTIONS_SCHEMA, options, "vue-svg-inline-loader");

	/* check if SVGO can be used */
	options._svgo = !!options.svgo;

	/* check if sprites can be used */
	options._sprites = !!(path.extname(this.resourcePath).toLowerCase() === ".vue" && REGEXP_VUE_SFC_HTML.test(content));

	/* validate keywords and define regular expression */
	for(const keyword of [options.inline.keyword, options.sprite.keyword]) {
		if(!REGEXP_ATTRIBUTE_NAME.test(keyword)) {
			throw new Error(`Keyword ${keyword} is not valid.`);
		}
	}
	const REGEXP_INLINE_KEYWORD = new RegExp(`\\s+(?:data-)?(?:v-)?${options.inline.keyword}\\s+`, "i");
	const REGEXP_SPRITE_KEYWORD = new RegExp(`\\s+(?:data-)?(?:v-)?${options.sprite.keyword}\\s+`, "i");

	/* initialize svgo */
	const svgo = options._svgo && new SVGO(options.svgo === true ? DEFAULT_OPTIONS.svgo : options.svgo);

	/* create empty symbols set */
	const symbols = new Set();

	/* async replace */
	replace(content, REGEXP_IMAGE_SRC_SVG, async (image, leftQuote, source, rightQuote) => {

		/* check if quotes match */
		const quotesMatch = leftQuote && rightQuote && leftQuote === rightQuote;

		/* check if image is wrapped in characters marking image to be not processed */
		if(quotesMatch && ["#", "```"].includes(leftQuote)) {
			return image.replace(new RegExp(`^${leftQuote}`), "").replace(new RegExp(`${rightQuote}$`), "");
		}

		/* check for keyword in strict mode */
		if(options.inline.strict && !REGEXP_INLINE_KEYWORD.test(image)) {
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
			file.content = readFileSync(file.path, { encoding: "utf-8" }).trim();
		} catch(error) {
			throw new Error(`File ${file.path} does not exist.`);
		}

		/* log image */
		if(options.verbose) {
			console.log("before replace:\t%s", image);
		}

		/* log svg */
		if(options.verbose) {
			console.log("before replace:\t%s", file.content);
		}

		/* check if svg content is not empty */
		if(!REGEXP_SVG_CONTENT.test(file.content)) {
			throw new Error(`File ${file.path} is empty.`);
		}

		/* process file content with svgo */
		try {
			file.content = options._svgo && (await svgo.optimize(file.content, { path: file.path })).data || file.content; // eslint-disable-line require-atomic-updates
		} catch(error) {
			throw new Error(`SVGO for ${file.path} failed.`);
		}

		/* remove unnecessary whispace from svg */
		// file.content = file.content.replace(REGEXP_SVG_WHITESPACE, " ").replace(REGEXP_SVG_WHITESPACE_TAGS, "><").trim();

		/* create attributes map */
		const attributes = createAttributeMap(image);

		/* handle svg as sprite or transform alt attribute to title tag if enabled in options */
		if(!options.sprite.strict || REGEXP_SPRITE_KEYWORD.test(image)) {
			if(options._sprites && !REGEXP_USE_TAG.test(file.content)) {
				file.content = file.content.replace(REGEXP_SVG_CONTENT, (svg, attributes, symbol) => { // eslint-disable-line no-unused-vars, require-atomic-updates

					/* create unique id for svg based on svg file path */
					const developmentId = [this.resourcePath, file.path].map(path => path.replace(this.rootContext, "")).join(":");
					const id = [options.sprite.keyword, options.md5 ? crypto.createHash("md5").update(developmentId).digest("hex") : developmentId].join(options.md5 ? "-" : ":");

					/* add svg into symbol set */
					symbols.add(`<symbol id="${id}"${attributes}>${symbol}</symbol>`); // .has() is not neccessary

					/* create attribute map if necessary */
					const _attributes = options.cloneAttributes.length ? createAttributeMap(attributes) : null;

					/* return svg link */
					return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"${options.cloneAttributes.length ? ` ${options.cloneAttributes.filter(attribute => !!attribute && _attributes.has(attribute)).map(attribute => `${attribute}="${_attributes.get(attribute)}"`).join(" ")}` : "" }><use xlink:href="#${id}" href="#${id}"></use></svg>`;

				});
			}
		} else if(options.addTitle && attributes.has("alt")) {
			const alternativeTitle = attributes.get("alt");
			file.content = REGEXP_SVG_TITLE.test(file.content) ? file.content.replace(REGEXP_SVG_TITLE, (svg, title) => svg.replace(title, `<title>${alternativeTitle}</title>`)) : file.content.replace(REGEXP_SVG_CONTENT, (svg, attributes, symbol) => svg.replace(symbol, `<title>${alternativeTitle}</title>${symbol}`)); // eslint-disable-line no-unused-vars, require-atomic-updates
		}

		/* add attributes if not present */
		for(const attribute in options.addAttributes) {
			if(!attributes.has(attribute)) {
				attributes.set(attribute, options.addAttributes[attribute].toString());
			}
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

		/* overwrite wrapping quotes with backticks */
		if(quotesMatch && ["\"", "'"].includes(leftQuote)) {
			leftQuote = rightQuote = "`";
		}

		/* inject attributes as Vue bindings to file content if available */
		file.content = (leftQuote || "") + (attributes.size ? file.content.replace(REGEXP_SVG_TAG, "$& " + [...attributes.keys()].map(attribute => {
			let name = attribute;
			let value = attributes.get(attribute);

			value = (value ? value : (options.xhtml ? name : "")).replace(/"/g, "'");
			if(options.transformImageAttributesToVueDirectives && !REGEXP_ATTRIBUTE_NAME_VUE.test(name)) {
				name = `v-bind:${name}`;
				value = `'${value}'`;
			}

			return `${name}="${value}"`;
		}).join(" ")) : file.content) + (rightQuote || "");

		/* log svg */
		if(options.verbose) {
			console.log("after replace:\t%s", file.content);
			console.log(); // new line
		}

		/* return file content */
		return file.content;

	}).then(content => {

		/* inject symbols into file content if available and return it */
		return callback(null, options._sprites && symbols.size ? content.replace(REGEXP_BEFORE_ROOT_CLOSE_TAG, `$1<svg xmlns="http://www.w3.org/2000/svg" style="display: none !important;">${[...symbols].join("")}</svg>$2`) : content);

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

function createAttributeMap(string) {

	/* create empty attribute map */
	const attributes = new Map();

	/* parse attributes into attribute map */
	let attribute;
	REGEXP_ATTRIBUTES.lastIndex = 0;
	while(attribute = REGEXP_ATTRIBUTES.exec(string)) { // eslint-disable-line no-cond-assign
		if(attribute.index === REGEXP_ATTRIBUTES.lastIndex) {
			REGEXP_ATTRIBUTES.lastIndex++;
		}
		if(attribute[1] && !REGEXP_TAG.test(attribute[1]) && REGEXP_ATTRIBUTE_NAME.test(attribute[1])) {
			attributes.set(attribute[1].toLowerCase(), attribute[2] || attribute[3] || "");
		}
	}

	/* return parsed attribute map */
	return attributes;

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
