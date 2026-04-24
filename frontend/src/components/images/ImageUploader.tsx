import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import type { AxiosProgressEvent } from 'axios';
import { api } from '../../lib/api';
import { useCamera } from '../../hooks/useCamera';
import type { Image, ImageType } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageUploaderProps {
  entityType: string;
  entityId: string;
  imageType: ImageType;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  showCamera?: boolean;
  onUploadComplete: (images: Image[]) => void;
  onError?: (error: string) => void;
}

interface PreviewFile {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  errorMsg?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const COMPRESS_TARGET = 2 * 1024 * 1024;   // 2 MB
const DEFAULT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function compressImage(file: File, targetBytes: number): Promise<File> {
  if (file.size <= targetBytes) return file;
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.sqrt(targetBytes / file.size);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * ratio);
      canvas.height = Math.round(img.naturalHeight * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        0.82,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function uploadFile(
  file: File,
  entityType: string,
  entityId: string,
  imageType: ImageType,
  onProgress: (p: number) => void,
): Promise<Image> {
  const form = new FormData();
  form.append('file', file);
  form.append('entityType', entityType);
  form.append('entityId', entityId);
  form.append('imageType', imageType);

  const response = await api.post<{ data: Image }>('/images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event: AxiosProgressEvent) => {
      if (event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });

  return response.data.data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImageUploader({
  entityType,
  entityId,
  imageType,
  maxFiles = 10,
  maxFileSize = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_TYPES,
  showCamera = true,
  onUploadComplete,
  onError,
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<PreviewFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { takePhoto, isAvailable: cameraAvailable } = useCamera();

  const showCameraBtn = showCamera && cameraAvailable;

  // ── Validate & queue files ────────────────────────────────────────────────

  const queueFiles = useCallback(
    async (rawFiles: File[]) => {
      const remaining = maxFiles - previews.length;
      if (remaining <= 0) {
        onError?.(`Maximum ${maxFiles} files allowed`);
        return;
      }
      const toProcess = rawFiles.slice(0, remaining);
      const invalid = rawFiles.slice(remaining);
      if (invalid.length) onError?.(`Only ${remaining} more file(s) allowed`);

      const newPreviews: PreviewFile[] = [];
      for (const file of toProcess) {
        if (!acceptedTypes.includes(file.type)) {
          onError?.(`${file.name}: unsupported file type`);
          continue;
        }
        if (file.size > maxFileSize) {
          onError?.(`${file.name}: exceeds ${Math.round(maxFileSize / 1024 / 1024)} MB limit`);
          continue;
        }
        newPreviews.push({
          id: `${Date.now()}_${Math.random()}`,
          file,
          previewUrl: URL.createObjectURL(file),
          progress: 0,
          status: 'pending',
        });
      }
      if (!newPreviews.length) return;
      setPreviews((prev) => [...prev, ...newPreviews]);

      // Start uploading each
      const uploaded: Image[] = [];
      for (const preview of newPreviews) {
        try {
          const compressed = await compressImage(preview.file, COMPRESS_TARGET);
          setPreviews((prev) =>
            prev.map((p) => (p.id === preview.id ? { ...p, status: 'uploading' } : p)),
          );
          const image = await uploadFile(
            compressed,
            entityType,
            entityId,
            imageType,
            (progress) =>
              setPreviews((prev) =>
                prev.map((p) => (p.id === preview.id ? { ...p, progress } : p)),
              ),
          );
          setPreviews((prev) =>
            prev.map((p) => (p.id === preview.id ? { ...p, status: 'done', progress: 100 } : p)),
          );
          uploaded.push(image);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setPreviews((prev) =>
            prev.map((p) => (p.id === preview.id ? { ...p, status: 'error', errorMsg: msg } : p)),
          );
          onError?.(msg);
        }
      }
      if (uploaded.length) onUploadComplete(uploaded);
    },
    [previews.length, maxFiles, acceptedTypes, maxFileSize, entityType, entityId, imageType, onUploadComplete, onError],
  );

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      queueFiles(files);
    },
    [queueFiles],
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      queueFiles(files);
      e.target.value = '';
    },
    [queueFiles],
  );

  const handleCamera = useCallback(async () => {
    const file = await takePhoto();
    if (file) queueFiles([file]);
  }, [takePhoto, queueFiles]);

  const removePreview = useCallback((id: string) => {
    setPreviews((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image — tap or drag here"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        className={[
          'flex flex-col items-center justify-center gap-3',
          'min-h-[180px] rounded-2xl border-2 border-dashed cursor-pointer',
          'transition-colors duration-150 select-none',
          'p-6 text-center',
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40',
        ].join(' ')}
      >
        <span className="text-4xl leading-none" aria-hidden>📷</span>
        <div>
          <p className="font-semibold text-gray-700">Tap to upload image</p>
          <p className="text-sm text-gray-500">or drag &amp; drop here</p>
        </div>
        <p className="text-xs text-gray-400">JPG, PNG, WebP up to {Math.round(maxFileSize / 1024 / 1024)} MB</p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {showCameraBtn && (
          <button
            type="button"
            onClick={handleCamera}
            className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-blue-600 text-white font-medium text-sm active:bg-blue-700 transition-colors"
          >
            <span aria-hidden>📷</span> Take Photo
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-2 min-h-[48px] rounded-xl border border-gray-300 bg-white text-gray-700 font-medium text-sm active:bg-gray-100 transition-colors"
        >
          <span aria-hidden>📁</span> Choose File
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        multiple
        className="sr-only"
        onChange={handleFileInput}
      />

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((p) => (
            <div key={p.id} className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
              <img
                src={p.previewUrl}
                alt={p.file.name}
                className="w-full h-full object-cover"
              />

              {/* Progress overlay */}
              {p.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                  <div className="w-3/4 h-1.5 rounded-full bg-white/30 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-150"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-medium">{p.progress}%</span>
                </div>
              )}

              {/* Done check */}
              {p.status === 'done' && (
                <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}

              {/* Error */}
              {p.status === 'error' && (
                <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center p-1">
                  <span className="text-white text-xs text-center">{p.errorMsg ?? 'Failed'}</span>
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePreview(p.id); }}
                aria-label="Remove image"
                className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center active:bg-black/80"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
