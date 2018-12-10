# vue-svg-inline-loader

[![npm](https://img.shields.io/npm/v/vue-svg-inline-loader.svg?style=flat)](https://www.npmjs.com/package/vue-svg-inline-loader)
[![npm](https://img.shields.io/npm/dt/vue-svg-inline-loader.svg?style=flat)](https://www.npmjs.com/package/vue-svg-inline-loader)
[![npm](https://img.shields.io/npm/l/vue-svg-inline-loader.svg?style=flat)](https://www.npmjs.com/package/vue-svg-inline-loader)
[![paypal](https://img.shields.io/badge/donate-paypal-blue.svg?colorB=0070ba&style=flat)](https://paypal.me/oliverfindl)

[Webpack](https://github.com/webpack/webpack) loader used for inline replacement of SVG images with actual content of SVG files in [Vue](https://github.com/vuejs/vue) projects.

> Sprite option works only with [Vue](https://github.com/vuejs/vue) [Single File Component](https://vuejs.org/guide/single-file-components.html) approach and only with HTML template format.

> Loader has built-in [SVGO][SVGO] support for SVG optimization.

---

## Notable changes
* v1.2.5
	* Modified [svgo](#configuration) option to accept `null` or `false` value for disabling SVG optimization
* v1.2.3
	* Changed default value of [md5](#configuration) option to `true`
	* Added examples for [webpack](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/webpack), [vue-cli](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/vue-cli) and [nuxt](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/nuxt) based projects
* v1.2.0
	* Upgraded [Babel](https://github.com/babel/babel) to version 7
	* Refactored code to ES6 syntax
	* Added new option: [dataAttributes](#configuration)
	* [Options](#configuration) are now deep-merged
* v1.1.3
	* Added transpiled version of loader
* v1.1.0
	* Added new option: [md5](#configuration)
* v1.0.8
	* [Options](#configuration) structure changed, deprecated options still get parsed to new ones
* v1.0.0
	* Initial release based on my [img-svg-inline-loader](https://github.com/oliverfindl/img-svg-inline-loader) project

---

## Install

Via [npm](https://npmjs.com/) [[package](https://www.npmjs.com/package/vue-svg-inline-loader)]:
```bash
$ npm install vue-svg-inline-loader --save-dev
```

Via [yarn](https://yarnpkg.com/en/) [[package](https://yarnpkg.com/en/package/vue-svg-inline-loader)]:
```bash
$ yarn add vue-svg-inline-loader --dev
```

## Usage

With [webpack](https://webpack.js.org/) - [webpack.config.js](https://webpack.js.org/concepts/loaders/#configuration):
```javascript
module.exports = {
	module: {
		rules: [
			{
				test: /\.vue$/,
				use: [
					{
						loader: "vue-loader",
						options: { /* ... */ }
					},
					{
						loader: "vue-svg-inline-loader",
						options: { /* ... */ }
					}
				]
			}
		]
	}
};
```

With [vue-cli](https://cli.vuejs.org/) - [vue.config.js](https://cli.vuejs.org/guide/webpack.html#chaining-advanced):
```javascript
module.exports = {
	chainWebpack: config => {
		config.module
			.rule("vue")
			.use("vue-svg-inline-loader")
				.loader("vue-svg-inline-loader")
				.options({ /* ... */ });
	}
};
```

With [nuxt](https://nuxtjs.org/) - [nuxt.config.js](https://nuxtjs.org/faq/extend-webpack#how-to-extend-webpack-config-):
```javascript
module.exports = {
	build: {
		extend(config, { isDev, isClient }) {
			const vueRule = config.module.rules.find(rule => rule.test.test(".vue"));
			vueRule.use = [
				{
					loader: vueRule.loader,
					options: vueRule.options
				},
				{
					loader: "vue-svg-inline-loader",
					options: { /* ... */ }
				}
			];
			delete vueRule.loader;
			delete vueRule.options;
		}
	}
};
```

Basic inline SVG usage with `svg-inline` keyword directive:
```html
<img svg-inline class="icon" src="./images/example.svg" alt="example" />
```

Which replaces into:
```xml
<svg svg-inline class="icon" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="...">
	<path d="..."></path>
</svg>
```

Basic inline SVG sprite usage with `svg-sprite` keyword directive:
```html
<img svg-inline svg-sprite class="icon" src="./images/example.svg" alt="example" />
```

Which replaces into:
```xml
<!-- will get injected right after root opening tag in Vue component -->
<div style="display: none !important;">
	<svg>
		<symbols>
			<symbol id="svg-sprite-md5hash">
				<path d="..."></path>
			</symbol>
			<!-- ... -->
		</symbols>
	</svg>
</div>
<!-- ... -->
<svg svg-inline svg-sprite class="icon" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="...">
	<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#svg-sprite-md5hash"></use>
</svg>
```

### Notice

Loader won't parse any images with [Vue](https://github.com/vuejs/vue) [bindings](https://vuejs.org/v2/guide/class-and-style.html) used as `src` attribute [[more info](https://github.com/oliverfindl/vue-svg-inline-loader/issues/2)].

## Configuration

Default options:
```javascript
{
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
	svgo: {
		plugins: [
			{
				cleanupAttrs: true
			},
			// ...
		]
	}
}
```
Explanation:
* **inline.keyword:**  
Defines keyword, which marks images you want to replace with inline SVG. Keyword has to be wrapped with whitespace characters (e.g. space). 
In case of some conflicts, you can also use data version of your keyword (e.g. `data-keyword`).

* **inline.strict:**  
In strict mode loader replaces only images with defined keyword. If strict mode is disabled, loader replaces all images.

* **sprite.keyword:**  
Defines keyword, which marks images you want to replace with inline SVG using inline sprites. Keyword has to be wrapped with whitespace characters (e.g. space). 
In case of some conflicts, you can also use data version of your keyword (e.g. `data-keyword`).

* **sprite.strict:**  
In strict mode loader replaces only images with defined keyword. If strict mode is disabled, loader replaces all images.

* **dataAttributes:**  
Array of attributes which will be renamed to data-attributes.

* **removeAttributes:**  
Array of attributes which will be removed.

* **md5:**  
Use md5-encoded resource path as ID for inline SVG sprites instead of plaintext. Set it to `false` only for development purposes.

* **xhtml:**  
In XHTML mode attribute minimization is forbidden. Empty attributes are filled with their names to be XHTML-compliant (e.g. `disabled="disabled"`).

* **svgo:**  
[SVGO][SVGO] configuration object. Documentation can be found [here][SVGO]. Set to `null` or `false` to disable SVG optimization.

### Notice

User-defined options are deep-merged with default options. Arrays are not concatenated.

---

## License

[MIT](http://opensource.org/licenses/MIT)

[SVGO]: https://github.com/svg/svgo
