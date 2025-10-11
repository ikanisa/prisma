import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
});

export default withPWA({
  reactStrictMode: true,
  output: 'standalone'
});
