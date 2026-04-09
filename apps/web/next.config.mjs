import { codeInspectorPlugin } from 'code-inspector-plugin';

const nextConfig = {
  transpilePackages: ['@flowforge/shared'],
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.plugins.push(codeInspectorPlugin({ bundler: 'webpack' }));
    }
    return config;
  },
};

export default nextConfig;
