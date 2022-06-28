"use strict";

const { join } = require("path");

export default function vueSvgInlineLoaderModule(moduleOptions) {
	const options = Object.assign(
		{},
		this.options.vueSvgInlineLoader,
		moduleOptions
	);

	this.extendBuild((config) => {
		const vueRule = config.module.rules.find(
			({ test }) => test.toString() === /\.vue$/i.toString()
		);

		if (!vueRule.use) {
			vueRule.use = [
				{
					loader: vueRule.loader,
					options: vueRule.options,
				},
			];
			delete vueRule.loader;
			delete vueRule.options;
		}

		vueRule.use.push({
			loader: join(__dirname, "../index.js"),
			options,
		});
	});
}
