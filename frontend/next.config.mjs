/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use the `webpack` instance Next.js passes into this callback, not a
  // separately installed npm package -- Next bundles its own internal
  // webpack (next/dist/compiled/webpack), and a second, independently
  // resolved `webpack` package can be a different version with
  // incompatible internal hook shapes, which breaks with an opaque
  // "Cannot read properties of undefined (reading 'tap')" at build time
  // (confirmed live on this exact config before this fix).
  webpack: (config, { webpack }) => {
    // wagmi's default connector set transitively pulls in the Coinbase
    // Base Account connector -> @coinbase/cdp-sdk -> optional @x402/*
    // payment-protocol packages that aren't installed and aren't needed --
    // ToolBind never uses x402 payments, only GenLayer contract calls.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    // @metamask/sdk's React Native storage backend and pino's optional
    // pretty-printer transport are both unreachable in a browser/Next.js
    // build -- ignore rather than leave harmless "module not found"
    // warnings in every build log.
    config.plugins.push(
      new webpack.IgnorePlugin({ resourceRegExp: /^@react-native-async-storage\/async-storage$/ })
    );
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^pino-pretty$/ }));
    return config;
  },
};

export default nextConfig;
