# vue-svg-inline-loader

[![version](https://img.shields.io/npm/v/vue-svg-inline-loader.svg?style=flat)][npm]
[![downloads](https://img.shields.io/npm/dt/vue-svg-inline-loader.svg?style=flat)][npm]
[![license](https://img.shields.io/npm/l/vue-svg-inline-loader.svg?style=flat)][mit]
[![paypal](https://img.shields.io/badge/donate-paypal-blue.svg?colorB=0070ba&style=flat)](https://paypal.me/oliverfindl)

[Webpack](https://github.com/webpack/webpack) loader used for inline replacement of SVG images with actual content of SVG files in [Vue][vue] projects.

> Loader parses only HTML template format.

> Loader has built-in [SVGO][svgo] support for SVG optimization.

> Sprite option works only with [Vue Single File Component](https://vuejs.org/guide/single-file-components.html) approach.

---

### Vue CLI

[Vue 3](https://v3.vuejs.org/) projects created via [Vue CLI](https://cli.vuejs.org/) aren't built on top of [Webpack](https://github.com/webpack/webpack), they use Vite (which is build on top of [Rollup](https://rollupjs.org/)) instead. In this case, this loader won't work. Please take a look at [vue-svg-inline-plugin](https://github.com/oliverfindl/vue-svg-inline-plugin), which works similar to this loader.

---

## Notable changes

* v2.1.4
	* Added Nuxt module
* v2.1.0
	* Added new option: [cloneAttributes](#configuration)
* v2.0.0
	* Removed transpiled version
	* Removed [core-js](https://github.com/zloirock/core-js)@2 dependency
	* Recreated all examples (except vanilla Webpack one) with up-to-date CLIs
* v1.5.0
	* Added new option: [transformImageAttributesToVueDirectives](#configuration)
	* Added new option: [verbose](#configuration)
* v1.4.4
	* Updated order of attributes operations
* v1.4.0
	* Added new option: [addTitle](#configuration)
	* Fixed issue with lowercase-ing attribute values
* v1.3.1
	* Hotfixed issue with doubled attribute definitions on SVG node. This may introduce breaking changes for developers who used image definitions outside of template tag.
* v1.3.0
	* Added new option: [addAttributes](#configuration)
* v1.2.17
	* Add example usage configuration for laravel-mix based projects
* v1.2.16
	* Added example for [quasar](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/quasar) based projects 
* v1.2.14
	* Added example for [gridsome](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/gridsome) based projects
* v1.2.11
	 * Fixed a bug where original svg attributes were used by referencing svg rather than symbol itself. This may introduce breaking changes for developers who rely on this bugged behavior.
* v1.2.6
	* Modified default value of [svgo](#configuration) option to preserve viewBox attribute
	* Modified [svgo](#configuration) option to accept `true` value as alias for default [configuration](#configuration)
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

Via [npm](https://npmjs.com/) [[package][npm]]:
```bash
$ npm install vue-svg-inline-loader --save-dev
```

Via [yarn](https://yarnpkg.com/en/) [[package](https://yarnpkg.com/en/package/vue-svg-inline-loader)]:
```bash
$ yarn add vue-svg-inline-loader --dev
```

## Usage

With [webpack](https://webpack.js.org/) - [webpack.config.js](https://webpack.js.org/concepts/loaders/#configuration) (**recommended**):  
```javascript
// webpack

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
With [gridsome](https://gridsome.org/) - [gridsome.config.js](https://gridsome.org/docs/config#chainwebpack):  
With [quasar](https://quasar.dev/) - [quasar.conf.js](https://quasar.dev/quasar-cli/cli-documentation/handling-webpack#Usage-with-quasar.conf.js):  
```javascript
// vue-cli, gridsome, quasar

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
// nuxt

module.exports = {
	buildModules: [ 
		[ "vue-svg-inline-loader/nuxt", { /* options */ } ]
	],
	// or
	buildModules: [ "vue-svg-inline-loader/nuxt" ],
	vueSvgInlineLoader: {
		/* options */
	}
};
```

With [quasar](https://quasar.dev/) - [quasar.conf.js](https://quasar.dev/quasar-cli/cli-documentation/handling-webpack#Usage-with-quasar.conf.js):  
```javascript
// quasar

module.exports = {
	build: {
		extendWebpack(config) {
			const vueRule = config.module.rules.find(({ test }) => test.toString() === /\.vue$/.toString());
			vueRule.use.push({
				loader: "vue-svg-inline-loader",
				options: { /* ... */ }
			});
		}
	}
};
```

With [laravel-mix](https://laravel-mix.com/) - [webpack.mix.js](https://laravel-mix.com/docs/4.1/quick-webpack-configuration):
```javascript
// laravel-mix

const mix = require("laravel-mix");

mix.override(config => {
	config.module.rules.push({
		test: /\.vue$/,
		use: [{
			loader: "vue-svg-inline-loader",
			options: { /* ... */ }
		}]
	})
});
```

Basic inline SVG usage with `svg-inline` keyword directive:
```html
<img svg-inline class="icon" src="./images/example.svg" alt="example" />
```

Which replaces into:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="..." svg-inline role="presentation" focusable="false" tabindex="-1" class="icon">
	<path d="..."></path>
</svg>
```

Basic inline SVG sprite usage with `svg-sprite` keyword directive:
```html
<img svg-inline svg-sprite class="icon" src="./images/example.svg" alt="example" />
```

Which replaces into:
```xml
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="..." svg-inline svg-sprite role="presentation" focusable="false" tabindex="-1" class="icon">
	<use xlink:href="#svg-sprite-md5hash" href="#svg-sprite-md5hash"></use>
</svg>
<!-- ... -->
<!-- will get injected right before root closing tag in Vue component -->
<svg xmlns="http://www.w3.org/2000/svg" style="display: none !important;">
	<symbol id="svg-sprite-md5hash" xmlns="http://www.w3.org/2000/svg" viewBox="...">
		<path d="..."></path>
	</symbol>
	<!-- ... -->
</svg>
```

### Notice

Loader won't parse any images with [Vue bindings][vue-bindings] used as `src` attribute [[more info](https://github.com/oliverfindl/vue-svg-inline-loader/issues/2)].

If you need to preserve image tag (e.g. in comments), you can wrap it in hash (`#`) or triple backtick (` ``` `) characters.

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
	svgo: true,
/* value true for svgo option is alias for:
	svgo: {
		plugins: [
			{
				removeViewBox: false
			}
		]
	},
*/
	verbose: false
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

* **addTitle:**  
Transform image `alt` attribute into SVG `title` tag, if not defined (removed with [SVGO][svgo] by default). This option has no effect while using inline SVG sprites.

* **cloneAttributes:**  
Array of attributes which will be cloned into SVG link node while using inline SVG sprites.

* **addAttributes:**  
Object of attributes which will be added.

* **dataAttributes:**  
Array of attributes which will be renamed to data-attributes.

* **removeAttributes:**  
Array of attributes which will be removed.

* **transformImageAttributesToVueDirectives:**  
Transforms all non-[Vue][vue] image tag attributes via [Vue][vue] `v-bind` directive. With this option enabled, [Vue][vue] will handle merge / replace attributes, that are present on both resources - image tag and SVG tag. This might cause issues, when using [Vue bindings][vue-bindings] on image tag attribute, that is also present on SVG tag (e.g.: class attribute). Please use [verbose](#configuration) option for local debugging before submitting new issue.

* **md5:**  
Use md5-encoded resource path as ID for inline SVG sprites instead of plaintext. Set it to `false` only for development purposes.

* **xhtml:**  
In XHTML mode attribute minimization is forbidden. Empty attributes are filled with their names to be XHTML-compliant (e.g. `disabled="disabled"`).

* **svgo:**  
Pass [SVGO][svgo] configuration object (documentation can be found [here][svgo]) or `true` for default configuration. Pass `null` or `false` to disable SVG optimization.

* **verbose:**  
Will print image tag, SVG tag and modified SVG tag (with attributes from image tag) for debugging purposes.

### Notices

* User-defined options are deep-merged with default options. Arrays are not concatenated.

## Examples

* [gridsome example](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/gridsome)

* [nuxt example](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/nuxt)

* [quasar example](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/quasar)

* [vue-cli example](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/vue-cli)

* [webpack example](https://github.com/oliverfindl/vue-svg-inline-loader/tree/master/examples/webpack)

---

## License

[MIT][mit]

[mit]: https://opensource.org/licenses/MIT
[npm]: https://www.npmjs.com/package/vue-svg-inline-loader
[svgo]: https://github.com/svg/svgo
[vue]: https://github.com/vuejs/vue
[vue-bindings]: https://vuejs.org/v2/guide/class-and-style.html
