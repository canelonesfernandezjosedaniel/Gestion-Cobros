/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'query', key: 'mode', value: 'inventario' }],
        destination: '/catalogo',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
