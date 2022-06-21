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
		vueRule.use = [
			{
				loader: vueRule.loader,
				options: vueRule.options,
			},
			{
				loader: join(__dirname, "../index.js"),
				loader: "vue-svg-inline-loader",
				options,
			},
		];
		delete vueRule.loader;
		delete vueRule.options;
	});
}
