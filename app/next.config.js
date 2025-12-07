/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... остальные настройки ...
  
  // ✅ КРИТИЧЕСКИЙ ФИКС для pdf-parse:
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Это указывает Next.js не бандлить эти пакеты
      // и рассматривать их как внешние (Node.js) модули.
      config.externals.push('pdf-parse'); 
    }
    return config;
  },
};

module.exports = nextConfig;