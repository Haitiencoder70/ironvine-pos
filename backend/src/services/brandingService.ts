import { put } from '@vercel/blob';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import type { SaveBrandingInput } from '../validators/branding';

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);
const FAVICON_MIME_TYPES = new Set(['image/png', 'image/x-icon', 'image/vnd.microsoft.icon']);
const LOGO_MAX_BYTES = 2 * 1024 * 1024;    // 2 MB
const FAVICON_MAX_BYTES = 512 * 1024;       // 512 KB

// ─── CSS Sanitizer ────────────────────────────────────────────────────────────

const CSS_DANGEROUS_PATTERNS = [
  /url\s*\(/gi,
  /@import/gi,
  /expression\s*\(/gi,
  /javascript\s*:/gi,
  /-moz-binding/gi,
  /behavior\s*:/gi,
];

function sanitizeCSS(raw: string): string {
  let css = raw;
  for (const pattern of CSS_DANGEROUS_PATTERNS) {
    css = css.replace(pattern, '/* removed */');
  }
  return css;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getBranding(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
    select: {
      logoUrl:          true,
      faviconUrl:       true,
      primaryColor:     true,
      secondaryColor:   true,
      customCSS:        true,
      emailFromName:    true,
      emailFromAddress: true,
      customDomain:     true,
      name:             true,
      plan:             true,
    },
  });
  return org;
}

export async function saveBranding(orgId: string, input: SaveBrandingInput) {
  const sanitized = {
    ...input,
    customCSS: input.customCSS ? sanitizeCSS(input.customCSS) : input.customCSS,
  };

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: sanitized,
    select: {
      logoUrl:          true,
      faviconUrl:       true,
      primaryColor:     true,
      secondaryColor:   true,
      customCSS:        true,
      emailFromName:    true,
      emailFromAddress: true,
      customDomain:     true,
      name:             true,
      plan:             true,
    },
  });
  return org;
}

export async function uploadBrandingAsset(
  orgId: string,
  file: Express.Multer.File,
  type: 'logo' | 'favicon',
): Promise<string> {
  const allowedTypes = type === 'logo' ? LOGO_MIME_TYPES : FAVICON_MIME_TYPES;
  const maxBytes = type === 'logo' ? LOGO_MAX_BYTES : FAVICON_MAX_BYTES;

  if (!allowedTypes.has(file.mimetype)) {
    throw new AppError(
      400,
      `Invalid file type for ${type}. Allowed: ${[...allowedTypes].join(', ')}`,
      'INVALID_FILE_TYPE',
    );
  }

  if (file.size > maxBytes) {
    throw new AppError(
      400,
      `File too large. Maximum size for ${type}: ${Math.round(maxBytes / 1024)}KB`,
      'FILE_TOO_LARGE',
    );
  }

  const ext = file.originalname.split('.').pop() ?? (type === 'favicon' ? 'ico' : 'png');
  const path = `branding/${orgId}/${type}.${ext}`;

  const blob = await put(path, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
    addRandomSuffix: false,
  });

  const field = type === 'logo' ? 'logoUrl' : 'faviconUrl';
  await prisma.organization.update({
    where: { id: orgId },
    data: { [field]: blob.url },
  });

  return blob.url;
}
