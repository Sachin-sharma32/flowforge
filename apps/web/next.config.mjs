import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@flowforge/shared'],
  webpack: (config, { dev, isServer }) => {
    // if (dev && !isServer) {
    //   const { codeInspectorPlugin } = require('code-inspector-plugin');
    //   config.plugins.push(
    //     codeInspectorPlugin({
    //       bundler: 'webpack',
    //       // Only activates when user holds these keys — dormant otherwise so HMR is not affected.
    //       hotKeys: ['altKey', 'shiftKey'],
    //       // Show a small toggle switch at the page edge (useful for debugging)
    //       showSwitch: false,
    //     }),
    //   );
    // }
    return config;
  },
};

export default nextConfig;
