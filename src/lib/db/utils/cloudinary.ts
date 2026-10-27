/**
 * Cloudinary Helper Utilities (P11 Platform)
 *
 * Provides URL generation, on-the-fly transformations, video thumbnail extraction,
 * and folder conventions for media stored on Cloudinary with URLs saved in MongoDB.
 */

import { v2 as cloudinary } from 'cloudinary';

export interface CloudinaryImageTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'thumb' | 'fit' | 'limit' | 'scale' | 'pad';
  gravity?: 'face' | 'faces' | 'auto' | 'center' | 'north' | 'south';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:eco' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  radius?: 'max' | number;
  dpr?: number | string;
}

export interface CloudinaryVideoTransformOptions {
  format?: 'auto' | 'mp4' | 'webm' | 'm3u8';
  quality?: 'auto' | 'auto:good' | 'auto:eco' | number;
  width?: number;
  height?: number;
  crop?: 'fill' | 'limit' | 'scale';
  streamingProfile?: 'auto' | 'hd' | 'sd';
}

export interface CloudinaryVideoThumbnailOptions {
  startOffset?: number | string;
  width?: number;
  height?: number;
  crop?: 'fill' | 'thumb' | 'fit';
  gravity?: 'auto' | 'center';
  format?: 'jpg' | 'webp' | 'png';
}

/**
 * Read and validate Cloudinary configuration.
 */
export function getCloudinaryConfig() {
  const cloudName =
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    'p11-alumni';

  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    isConfigured: Boolean(apiKey && apiSecret),
  };
}

/**
 * Standardized folder path conventions for P11 multi-tenant assets.
 */
export function buildCloudinaryAssetFolder(
  institutionCode: string,
  category: 'avatars' | 'video-cvs' | 'resumes' | 'verification' | 'general',
  identifier?: string
): string {
  const cleanCode = institutionCode.toLowerCase().trim();
  const base = `p11/${cleanCode}/${category}`;
  return identifier ? `${base}/${identifier}` : base;
}

/**
 * Extract publicId and resourceType from a Cloudinary URL.
 */
export function parseCloudinaryUrl(url: string): {
  publicId: string;
  resourceType: 'image' | 'video' | 'raw';
  format?: string;
} | null {
  if (!url || typeof url !== 'string') return null;

  try {
    const match = url.match(
      /res\.cloudinary\.com\/([^/]+)\/(image|video|raw)\/upload\/(?:v\d+\/)?(.+?)(?:\.([a-zA-Z0-9]+))?$/
    );
    if (!match) return null;

    const resourceType = match[2] as 'image' | 'video' | 'raw';
    const publicId = match[3];
    const format = match[4];

    return { publicId, resourceType, format };
  } catch {
    return null;
  }
}

/**
 * Build an optimized Cloudinary image URL with transformations.
 * Supports avatar crops, face detection, responsive dimensions, and format auto-optimization.
 */
export function buildCloudinaryImageUrl(
  publicIdOrUrl: string,
  options: CloudinaryImageTransformOptions = {}
): string {
  if (!publicIdOrUrl) return '';

  const {
    width,
    height,
    crop = 'fill',
    gravity = 'face',
    quality = 'auto',
    format = 'auto',
    radius,
    dpr,
  } = options;

  // Extract public ID if full URL is passed
  const parsed = parseCloudinaryUrl(publicIdOrUrl);
  const publicId = parsed ? parsed.publicId : publicIdOrUrl.replace(/^\/+/, '');

  const { cloudName } = getCloudinaryConfig();

  // Build transformation segments
  const transforms: string[] = [];

  if (crop) transforms.push(`c_${crop}`);
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (gravity && crop !== 'scale') transforms.push(`g_${gravity}`);
  if (quality) transforms.push(`q_${quality}`);
  if (format) transforms.push(`f_${format}`);
  if (radius) transforms.push(`r_${radius}`);
  if (dpr) transforms.push(`dpr_${dpr}`);

  const transformString = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformString}${publicId}`;
}

/**
 * Build an optimized Cloudinary video streaming URL.
 */
export function buildCloudinaryVideoUrl(
  publicIdOrUrl: string,
  options: CloudinaryVideoTransformOptions = {}
): string {
  if (!publicIdOrUrl) return '';

  const {
    format = 'auto',
    quality = 'auto',
    width,
    height,
    crop,
    streamingProfile,
  } = options;

  const parsed = parseCloudinaryUrl(publicIdOrUrl);
  const publicId = parsed ? parsed.publicId : publicIdOrUrl.replace(/^\/+/, '');

  const { cloudName } = getCloudinaryConfig();

  const transforms: string[] = [];
  if (quality) transforms.push(`q_${quality}`);
  if (format) transforms.push(`f_${format}`);
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  if (streamingProfile) transforms.push(`sp_${streamingProfile}`);

  const transformString = transforms.length > 0 ? `${transforms.join(',')}/` : '';
  const extension = format === 'm3u8' ? '.m3u8' : '';

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformString}${publicId}${extension}`;
}

/**
 * Generate an auto-extracted video thumbnail (poster image) from a Cloudinary video.
 * Captures frame at specified second offset (default: 0s).
 */
export function buildCloudinaryVideoThumbnail(
  publicIdOrUrl: string,
  options: CloudinaryVideoThumbnailOptions = {}
): string {
  if (!publicIdOrUrl) return '';

  const {
    startOffset = 0,
    width = 640,
    height = 360,
    crop = 'fill',
    gravity = 'auto',
    format = 'jpg',
  } = options;

  const parsed = parseCloudinaryUrl(publicIdOrUrl);
  const publicId = parsed ? parsed.publicId : publicIdOrUrl.replace(/^\/+/, '');

  const { cloudName } = getCloudinaryConfig();

  const transforms: string[] = [
    `so_${startOffset}`,
    `c_${crop}`,
    `w_${width}`,
    `h_${height}`,
    `g_${gravity}`,
    `f_${format}`,
    'q_auto',
  ];

  const transformString = `${transforms.join(',')}/`;
  // Clean extension from publicId if present
  const cleanId = publicId.replace(/\.[a-zA-Z0-9]+$/, '');

  return `https://res.cloudinary.com/${cloudName}/video/upload/${transformString}${cleanId}.${format}`;
}

/**
 * Generate signature and upload parameters for client-side direct signed upload.
 * Prevents exposing API Secret in browser while allowing direct Cloudinary uploads.
 */
export function generateCloudinaryUploadSignature(
  paramsToSign: Record<string, string | number | boolean>
): {
  signature: string;
  timestamp: number;
  apiKey?: string;
  cloudName: string;
} {
  const config = getCloudinaryConfig();
  if (!config.apiSecret || !config.apiKey) {
    throw new Error('Cloudinary API Key and Secret are required to generate upload signatures');
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const combined = { ...paramsToSign, timestamp };

  const signature = cloudinary.utils.api_sign_request(combined, config.apiSecret);

  return {
    signature,
    timestamp,
    apiKey: config.apiKey,
    cloudName: config.cloudName,
  };
}
