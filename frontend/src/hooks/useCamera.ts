import { useCallback, useRef } from 'react';
import { logger } from '../lib/logger';

export interface UseCameraReturn {
  takePhoto: () => Promise<File | null>;
  isAvailable: boolean;
}

export function useCamera(): UseCameraReturn {
  const streamRef = useRef<MediaStream | null>(null);

  const isAvailable =
    typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;

  const takePhoto = useCallback(async (): Promise<File | null> => {
    if (!isAvailable) return null;

    try {
      // Prefer rear (environment) camera on mobile
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;

      // Create off-screen video element to capture frame
      const video = document.createElement('video');
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => resolve());
        };
      });

      // Small delay so camera has time to focus/expose
      await new Promise((r) => setTimeout(r, 400));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(video, 0, 0);

      // Stop all tracks immediately
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      return new Promise<File | null>((resolve) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(null); return; }
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            resolve(file);
          },
          'image/jpeg',
          0.9,
        );
      });
    } catch (err) {
      // Clean up stream on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      logger.error('[useCamera] takePhoto error:', err);
      return null;
    }
  }, [isAvailable]);

  return { takePhoto, isAvailable };
}
