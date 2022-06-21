const { join } = require("path");

export default function vueSvgInlineLoaderModule(moduleOptions) {
  const options = Object.assign(
    {},
    this.options.svgInlineLoader,
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
        // loader: "vue-svg-inline-loader", // in a real project
        loader: join(__dirname, "../../../index.js"), // for this demo
        options,
      },
    ];
    delete vueRule.loader;
    delete vueRule.options;
  });
}
