import React, { useState, useRef, useCallback } from 'react';
import type { Attachment } from '../types';

const MAX_IMAGE_DIMENSION = 1920;
const COMPRESSION_QUALITY = 0.8;

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_IMAGE_DIMENSION) {
            height *= MAX_IMAGE_DIMENSION / width;
            width = MAX_IMAGE_DIMENSION;
          }
        } else {
          if (height > MAX_IMAGE_DIMENSION) {
            width *= MAX_IMAGE_DIMENSION / height;
            height = MAX_IMAGE_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', COMPRESSION_QUALITY));
        } else {
          resolve(img.src); // Fallback if canvas context fails
        }
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const isTextFile = (file: File) => {
  const textTypes = ['text/', 'application/json', 'application/javascript', 'application/xml', 'application/x-sh', 'application/x-httpd-php'];
  const textExtensions = ['.ts', '.tsx', '.md', '.csv', '.env', '.gitignore', '.json'];
  return textTypes.some(type => file.type.startsWith(type)) || textExtensions.some(ext => file.name.endsWith(ext));
};

/**
 * Manages attachments for chat messages.
 * Handles file selection, image compression, text reading, and removal.
 */
export function useAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      if (selectedFiles.length === 0) return;

      setIsProcessing(true);
      
      try {
        const newAttachments: Attachment[] = [];
        
        for (const file of selectedFiles) {
          if (file.type.startsWith('image/')) {
            const dataUrl = await compressImage(file);
            const base64 = dataUrl.split(',')[1];
            newAttachments.push({
              url: dataUrl,
              base64,
              name: file.name,
              type: file.type,
              size: file.size,
              isText: false
            });
          } else if (isTextFile(file)) {
            const textContent = await readTextFile(file);
            newAttachments.push({
              url: '', // No preview URL for text files
              base64: '', // Not needed for text files
              name: file.name,
              type: file.type,
              size: file.size,
              isText: true,
              textContent
            });
          } else {
            console.warn(`Unsupported file type: ${file.type}`);
            // Could add a toast notification here
          }
        }

        setAttachments((prev) => [...prev, ...newAttachments]);
      } catch (error) {
        console.error('Error processing files:', error);
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    []
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return {
    attachments,
    isProcessing,
    fileInputRef,
    handleFileChange,
    removeAttachment,
    clearAttachments,
  };
}
