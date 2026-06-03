const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import("next").NextConfig} */
const nextConfig = {
  transpilePackages: ['@conversionops/ui', '@conversionops/types'],
};

module.exports = withSentryConfig(nextConfig, {
  // Only upload source maps when SENTRY_AUTH_TOKEN is set (CI/CD)
  silent: !process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  // Disable source map upload if no auth token — avoids build failure in local dev
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  // Suppress Sentry CLI output in CI unless verbose
  hideSourceMaps: true,
  disableLogger: true,
});
