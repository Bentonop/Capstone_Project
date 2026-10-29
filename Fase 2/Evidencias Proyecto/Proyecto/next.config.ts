/** @type {import('next').NextType} */
const nextConfig = {
  // Permite conexiones desde tu IP de red o dominios como ngrok
  allowedDevOrigins: ['192.168.56.1', '192.168.1.*', '*.ngrok-free.app'],
};

export default nextConfig;