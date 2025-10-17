export const APP_CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FREE_EXPORTS: parseInt(import.meta.env.VITE_MAX_FREE_EXPORTS) || 3,
  PREMIUM_PRICE: parseInt(import.meta.env.VITE_PREMIUM_PRICE) || 999, // $9.99 in cents
  SUPPORTED_VIDEO_FORMATS: ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'],
  SUPPORTED_PDF_FORMATS: ['application/pdf'],
};

export const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Courier New',
  'Georgia',
  'Verdana',
  'Impact',
  'Comic Sans MS',
];

export const FONT_SIZES = [
  8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72
];

export const TEXT_COLORS = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
];

export const STORAGE_BUCKETS = {
  USER_FILES: 'user-files',
  PROCESSED_FILES: 'processed-files',
} as const;