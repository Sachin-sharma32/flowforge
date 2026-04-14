import { createRequire } from 'node:module';

const enableCodeInspector = process.env.NEXT_PUBLIC_ENABLE_CODE_INSPECTOR === 'true';
const require = createRequire(import.meta.url);
let codeInspectorPlugin;

if (enableCodeInspector) {
  ({ codeInspectorPlugin } = require('code-inspector-plugin'));
}

const nextConfig = {
  transpilePackages: ['@flowforge/shared'],
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer && codeInspectorPlugin) {
      config.plugins.push(codeInspectorPlugin({ bundler: 'webpack' }));
    }
    return config;
  },
};

export default nextConfig;
