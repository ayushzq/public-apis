/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a minimal `.next/standalone` build with only the files needed
  // to run — this is what the AWS Dockerfile below relies on to keep the
  // final image small instead of shipping the whole node_modules tree.
  // (Harmless on Vercel too — Vercel's own build step ignores it.)
  output: 'standalone',

  // Perf fix (BaseKey audit — "application bohot fast khule, purane
  // browser support ho"): Next.js/Vercel already negotiate compression
  // automatically based on the browser's `Accept-Encoding` header — Brotli
  // for modern browsers, falling back to gzip, then deflate, for anything
  // old — so there's no separate "compressor library" to add; `compress`
  // just makes sure Next's own server (when self-hosted, e.g. the Docker/
  // AWS path below) does the same negotiation instead of shipping
  // uncompressed responses.
  compress: true,

  // No `.map` files shipped to the browser — smaller deploy, faster loads,
  // and source isn't exposed in devtools on the production build.
  productionBrowserSourceMaps: false,

  poweredByHeader: false,

  images: {
    // AVIF first (smallest), WebP fallback for slightly older browsers —
    // both are supported by every browser released in the last several
    // years; anything older just gets the original format automatically.
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [
      {
        // Ye saare routes (poori website) par apply hoga
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Koi tumhari site ko iframe me nahi khol payega (Clickjacking se bachaav)
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // Browser ko bewakoof banne se rokega
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload', // Hamesha HTTPS par force karega (1 saal ke liye)
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'none';", // Basic CSP, isko aage badhaya ja sakta hai
          }
        ],
      },
      {
        // Fingerprinted static assets (_next/static/**) are immutable —
        // cache them "forever" so a repeat visitor's browser never
        // re-downloads JS/CSS that hasn't changed. Next.js already
        // fingerprints these filenames per-build, so a new deploy gets a
        // new URL automatically — this header is always safe.
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
