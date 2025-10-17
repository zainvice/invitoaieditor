import { APP_CONFIG } from './constants';

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > APP_CONFIG.MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File size must be less than ${APP_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }

  // Check file type
  const supportedFormats = [
    ...APP_CONFIG.SUPPORTED_VIDEO_FORMATS,
    ...APP_CONFIG.SUPPORTED_PDF_FORMATS
  ];

  if (!supportedFormats.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only video files (MP4, MOV, AVI) and PDF files are supported'
    };
  }

  return { isValid: true };
};

export const getFileType = (file: File): 'video' | 'pdf' => {
  if (APP_CONFIG.SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
    return 'video';
  }
  return 'pdf';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const generateFileName = (userId: string, originalName: string): string => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `${userId}/${timestamp}.${extension}`;
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};