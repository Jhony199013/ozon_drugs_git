import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    // Оптимизация изображений
    formats: ['image/avif', 'image/webp'],
    // Минимальное качество для лучшей производительности
    minimumCacheTTL: 60,
    // Разрешенные размеры для оптимизации
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Отключение статической оптимизации только для разработки (если нужно)
    unoptimized: false,
  },
};

export default nextConfig;
