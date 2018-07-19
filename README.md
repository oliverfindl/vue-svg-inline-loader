# vue-svg-inline-loader

[![npm](https://img.shields.io/npm/v/vue-svg-inline-loader.svg?style=flat)](https://www.npmjs.com/package/vue-svg-inline-loader)
[![npm](https://img.shields.io/npm/dt/vue-svg-inline-loader.svg?style=flat)](https://www.npmjs.com/package/vue-svg-inline-loader)
[![npm](https://img.shields.io/npm/l/vue-svg-inline-loader.svg?style=flat)](https://www.npmjs.com/package/vue-svg-inline-loader)
[![paypal](https://img.shields.io/badge/donate-paypal-blue.svg?colorB=0070ba&style=flat)](https://paypal.me/oliverfindl)

[Webpack](https://github.com/webpack/webpack) loader used for inline replacement of SVG images with actual content of SVG files in [Vue](https://github.com/vuejs/vue) projects.

> Sprites works only with [Vue](https://github.com/vuejs/vue) [Single File Component](https://vuejs.org/guide/single-file-components.html) approach and only with HTML template format.

> Loader has built-in [SVGO](https://github.com/svg/svgo) support for SVG optimization.

> Based on my previous [img-svg-inline-loader](https://github.com/oliverfindl/img-svg-inline-loader).

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

In webpack config:
```javascript
{
	test: /\.vue$/,
	use: [
		"vue-loader",
		{
			loader: "vue-svg-inline-loader",
			options: { /* ... */ }
		},
		// ...
	]
}
```

Inline replacement:
```html
<img svg-inline class="icon" src="./images/example.svg" alt="example" />
```

Which replaces into inline SVG:
```xml
<svg svg-inline class="icon" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="...">
	<path d="..."></path>
</svg>
```

Or if you want to use inline sprites:
```html
<img svg-inline svg-sprite class="icon" src="./images/example.svg" alt="example" />
```

Which replaces into inline SVG using inline sprites:
```xml
<!-- will get injected right after root opening tag in Vue component -->
<div style="display: none !important;">
	<svg>
		<symbols>
			<symbol id="svg-sprite-example">
				<path d="..."></path>
			</symbol>
			<!-- ... -->
		</symbols>
	</svg>
</div>
<!-- ... -->
<!-- later in code -->
<svg svg-inline svg-sprite class="icon" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="...">
	<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#svg-sprite-example"></use>
</svg>
```

### Notice

Loader won't parse any images with [Vue](https://github.com/vuejs/vue) [bindings](https://vuejs.org/v2/guide/class-and-style.html) used as `src` attribute [[more info](https://github.com/oliverfindl/vue-svg-inline-loader/issues/2)].

## Configuration

Default options:
```javascript
{
	inlineKeyword: "svg-inline",
	inlineStrict: true,
	spriteKeyword: "svg-sprite",
	spriteStrict: true,
	removeAttributes: ["alt", "src"],
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
* **inlineKeyword:**  
Defines keyword, which marks images you want to replace with inline SVG. Keyword has to be wrapped with whitespace characters (e.g. space). 
In case of some conflicts, you can also use data version of your keyword (e.g. `data-keyword`).

* **inlineStrict:**  
In strict mode loader replaces only images with defined keyword. If strict mode is disabled, loader replaces all images.

* **spriteKeyword:**  
Defines keyword, which marks images you want to replace with inline SVG using inline sprites. Keyword has to be wrapped with whitespace characters (e.g. space). 
In case of some conflicts, you can also use data version of your keyword (e.g. `data-keyword`).

* **spriteStrict:**  
In strict mode loader replaces only images with defined keyword. If strict mode is disabled, loader replaces all images.

* **removeAttributes:**  
Array of attributes which will be removed from image tag and won't be transferred to inline SVG replacement.

* **xhtml:**  
In XHTML mode attribute minimization is forbidden. Empty attributes are filled with their names to be XHTML-compliant (e.g. `disabled="disabled"`).

* **svgo:**  
[SVGO](https://github.com/svg/svgo) configuration object. Documentation can be found [here](https://github.com/svg/svgo).

### Notice

User-defined options are not deep-merged with default options.

---

## License

[MIT](http://opensource.org/licenses/MIT)
