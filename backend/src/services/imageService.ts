import { Image, ImageType, GarmentType } from '@prisma/client';
import { put, del } from '@vercel/blob';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../middleware/errorHandler';
import {
  validateImageFile,
  resizeImage,
  optimizeImage,
  generateColoredPlaceholder,
} from '../utils/imageProcessing';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadImageInput {
  organizationId: string;
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  fileSize: number;
  imageType: ImageType;
  entityType: string;
  entityId: string;
  alt?: string;
  caption?: string;
  designPlacement?: string;
  createdBy?: string;
}

export interface ImageWithMeta extends Image {
  placeholderSvg?: string;
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadImage(input: UploadImageInput): Promise<Image> {
  const {
    organizationId,
    buffer,
    originalName,
    mimeType,
    fileSize,
    imageType,
    entityType,
    entityId,
    alt,
    caption,
    designPlacement,
    createdBy,
  } = input;

  validateImageFile(mimeType, fileSize);

  // Skip sharp processing for SVGs — store as-is
  let optimizedBuffer = buffer;
  let width: number | undefined;
  let height: number | undefined;
  let thumbnailUrl: string | undefined;

  if (mimeType !== 'image/svg+xml') {
    const optimized = await optimizeImage(buffer, mimeType);
    optimizedBuffer = optimized.buffer;
    width = optimized.width;
    height = optimized.height;

    const thumbBuffer = await resizeImage(optimizedBuffer, 400);
    const thumbBlob = await put(buildStoragePath(organizationId, entityType, entityId, originalName, 'thumb'), thumbBuffer, {
      access: 'public',
      contentType: mimeType,
    });
    thumbnailUrl = thumbBlob.url;
  }

  const mainBlob = await put(buildStoragePath(organizationId, entityType, entityId, originalName, 'full'), optimizedBuffer, {
    access: 'public',
    contentType: mimeType,
  });

  // Determine display order (append after existing images for this entity)
  const existingCount = await prisma.image.count({
    where: { organizationId, entityType, entityId },
  });

  // First image for entity is primary by default
  const isPrimary = existingCount === 0;

  const image = await prisma.image.create({
    data: {
      organizationId,
      url: mainBlob.url,
      thumbnailUrl,
      fileName: originalName,
      fileSize,
      mimeType,
      width,
      height,
      imageType,
      entityType,
      entityId,
      alt,
      caption,
      displayOrder: existingCount,
      isPrimary,
      designPlacement,
      createdBy,
    },
  });

  logger.info('Image uploaded', { imageId: image.id, organizationId, entityType, entityId });
  return image;
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteImage(organizationId: string, imageId: string): Promise<void> {
  const image = await prisma.image.findFirst({
    where: { id: imageId, organizationId },
  });

  if (!image) {
    throw new AppError(404, 'Image not found');
  }

  // Delete from Vercel Blob storage
  await del(image.url);
  if (image.thumbnailUrl) {
    await del(image.thumbnailUrl);
  }

  await prisma.image.delete({ where: { id: imageId } });

  // If deleted image was primary, promote the next image
  if (image.isPrimary) {
    const next = await prisma.image.findFirst({
      where: { organizationId, entityType: image.entityType, entityId: image.entityId },
      orderBy: { displayOrder: 'asc' },
    });
    if (next) {
      await prisma.image.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
  }

  logger.info('Image deleted', { imageId, organizationId });
}

// ─── Fetch ────────────────────────────────────────────────────────────────────

export async function getImagesForEntity(
  organizationId: string,
  entityType: string,
  entityId: string,
): Promise<Image[]> {
  return prisma.image.findMany({
    where: { organizationId, entityType, entityId },
    orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }],
  });
}

// ─── Set Primary ─────────────────────────────────────────────────────────────

export async function setPrimaryImage(organizationId: string, imageId: string): Promise<Image> {
  const image = await prisma.image.findFirst({
    where: { id: imageId, organizationId },
  });

  if (!image) {
    throw new AppError(404, 'Image not found');
  }

  // Clear existing primary for this entity
  await prisma.image.updateMany({
    where: {
      organizationId,
      entityType: image.entityType,
      entityId: image.entityId,
      isPrimary: true,
    },
    data: { isPrimary: false },
  });

  return prisma.image.update({
    where: { id: imageId },
    data: { isPrimary: true },
  });
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

export async function reorderImages(
  organizationId: string,
  imageIds: string[],
): Promise<void> {
  // Verify all images belong to this org
  const images = await prisma.image.findMany({
    where: { id: { in: imageIds }, organizationId },
    select: { id: true },
  });

  if (images.length !== imageIds.length) {
    throw new AppError(400, 'One or more images not found or not accessible');
  }

  await prisma.$transaction(
    imageIds.map((id, index) =>
      prisma.image.update({
        where: { id },
        data: { displayOrder: index },
      }),
    ),
  );
}

// ─── Garment Catalog ─────────────────────────────────────────────────────────

export interface GarmentImageResult {
  frontUrl: string;
  backUrl: string | null;
  mockupFrontUrl: string | null;
  source: 'database' | 'placeholder';
}

export async function getGarmentImage(
  brand: string,
  styleNumber: string,
  color: string,
  garmentType: GarmentType,
): Promise<GarmentImageResult> {
  const record = await prisma.garmentImage.findUnique({
    where: { brand_styleNumber_color: { brand, styleNumber, color } },
  });

  if (record) {
    return {
      frontUrl: record.frontUrl,
      backUrl: record.backUrl,
      mockupFrontUrl: record.mockupFrontUrl,
      source: 'database',
    };
  }

  // Fall back to SVG placeholder
  const hexColor = colorNameToHex(color);
  const svg = generateColoredPlaceholder({ garmentType, hexColor, showPrintArea: true });
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return {
    frontUrl: svgDataUrl,
    backUrl: null,
    mockupFrontUrl: svgDataUrl,
    source: 'placeholder',
  };
}

export function getPlaceholderSvg(garmentType: GarmentType, hexColor: string): string {
  return generateColoredPlaceholder({ garmentType, hexColor, showPrintArea: true });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildStoragePath(
  organizationId: string,
  entityType: string,
  entityId: string,
  fileName: string,
  variant: 'full' | 'thumb',
): string {
  const timestamp = Date.now();
  const ext = fileName.split('.').pop() ?? 'jpg';
  return `${organizationId}/${entityType}/${entityId}/${variant}-${timestamp}.${ext}`;
}

/**
 * Maps common garment color names to approximate hex values.
 * Used when no stock image is available so the SVG placeholder
 * renders in the correct color.
 */
function colorNameToHex(colorName: string): string {
  const normalized = colorName.toLowerCase().trim();

  const COLOR_MAP: Record<string, string> = {
    black: '#1a1a1a',
    white: '#f5f5f5',
    'off white': '#f0ede4',
    grey: '#9e9e9e',
    gray: '#9e9e9e',
    'dark grey': '#424242',
    'dark gray': '#424242',
    'light grey': '#e0e0e0',
    'light gray': '#e0e0e0',
    red: '#d32f2f',
    'dark red': '#8b0000',
    maroon: '#800000',
    blue: '#1565c0',
    'navy blue': '#0d1b4e',
    navy: '#0d1b4e',
    'royal blue': '#1a47a8',
    'light blue': '#5b9bd5',
    'sky blue': '#87ceeb',
    green: '#2e7d32',
    'dark green': '#1b5e20',
    'forest green': '#2d5a27',
    'lime green': '#8bc34a',
    yellow: '#f9a825',
    gold: '#ffc107',
    orange: '#e65100',
    purple: '#6a1b9a',
    'dark purple': '#4a0080',
    lavender: '#9c89b8',
    pink: '#e91e63',
    'hot pink': '#ff1493',
    brown: '#5d4037',
    tan: '#d2b48c',
    sand: '#c2b280',
    heather: '#b0a4a4',
    'athletic heather': '#c8c4be',
    'heather grey': '#b8b8b8',
    cardinal: '#9b0000',
    kelly: '#4caf50',
    'kelly green': '#4caf50',
  };

  return COLOR_MAP[normalized] ?? '#808080';
}
