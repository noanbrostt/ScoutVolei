const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { DefinePlugin } = require('webpack');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Set the EXPO_ROUTER_APP_ROOT environment variable.
  // This is needed to resolve the 'Cannot find module 'undefined'' error.
  config.plugins.push(
    new DefinePlugin({
      'process.env.EXPO_ROUTER_APP_ROOT': JSON.stringify(path.resolve(__dirname, 'app')),
    })
  );

  // Customize the config before returning it.
  // Workaround for 'import.meta.url' error with drizzle-orm
  config.module.rules.push({
    test: /\.mjs$/,
    include: /node_modules/,
    type: 'javascript/auto',
  });

  // Alias for better-sqlite3
  config.resolve.alias = {
    ...config.resolve.alias,
    'better-sqlite3': require.resolve('./drizzle/sqlite-stub.js'),
  };

  return config;
};
