import type { ImageKitUploadAuth } from '@/lib/meals';

const API = 'https://api.imagekit.io/v1';
/** Signed upload params stay valid this long (ImageKit allows up to an hour). */
const UPLOAD_AUTH_TTL_S = 10 * 60;

/** `value`, or a helpful error when the env var `name` it was read from isn't set. */
function required(value: string | undefined, name: string) {
  if (!value) throw new Error(`${name} is not set. Add it to .env (ImageKit dashboard → Developer options).`);
  return value;
}

/** The folder holding everything uploaded for a user. */
const userFolder = (userId: string) => `/users/${userId}`;

/** The folder a user's meal photos live in. */
export const mealFolder = (userId: string) => `${userFolder(userId)}/meals`;

/**
 * Deletes everything uploaded for a user: their folder with all nested files and versions.
 * This includes photos that never became a meal (e.g. a scan rejected by the daily cap).
 * A folder that doesn't exist (nothing uploaded, or already deleted) is fine.
 */
export async function deleteUserFolder(userId: string) {
  const privateKey = required(process.env.IMAGEKIT_PRIVATE_KEY, 'IMAGEKIT_PRIVATE_KEY');
  const res = await fetch(`${API}/folder/`, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${btoa(`${privateKey}:`)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderPath: userFolder(userId) }),
  });
  if (res.ok || res.status === 404) return;
  throw new Error(`ImageKit folder delete failed (${res.status}): ${await res.text()}`);
}

/**
 * Signed params that let the app upload one file straight to ImageKit:
 * signature = HMAC-SHA1(token + expire) with the private key.
 */
export async function createUploadAuth(userId: string): Promise<ImageKitUploadAuth> {
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + UPLOAD_AUTH_TTL_S;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(required(process.env.IMAGEKIT_PRIVATE_KEY, 'IMAGEKIT_PRIVATE_KEY')),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${token}${expire}`));
  const signature = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('');

  const publicKey = required(process.env.IMAGEKIT_PUBLIC_KEY, 'IMAGEKIT_PUBLIC_KEY');
  return { token, expire, signature, publicKey, folder: mealFolder(userId) };
}

/** The uploaded file's path, or null if ImageKit doesn't know the id. */
export async function getFilePath(fileId: string): Promise<string | null> {
  const privateKey = required(process.env.IMAGEKIT_PRIVATE_KEY, 'IMAGEKIT_PRIVATE_KEY');
  const res = await fetch(`${API}/files/${encodeURIComponent(fileId)}/details`, {
    headers: { Authorization: `Basic ${btoa(`${privateKey}:`)}` },
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`ImageKit file details failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { filePath: string };
  return data.filePath;
}

/**
 * A delivery URL for a stored photo, resized by ImageKit and compressed (q-80) so clients
 * never download the original. With only a width the aspect ratio is kept; with both a
 * width and height ImageKit crops to that exact size, and `fo-auto` keeps the food in frame.
 */
export function imageUrl(filePath: string, { width, height }: { width: number; height?: number }) {
  const transforms = height ? `w-${width},h-${height},fo-auto,q-80` : `w-${width},q-80`;
  return `${endpoint()}${filePath}?tr=${transforms}`;
}

/**
 * A URL for a photo scaled to fit inside a `maxSide` square, with nothing cropped.
 * `c-at_max` keeps the aspect ratio and doesn't enlarge photos that are already smaller.
 */
export function fittedImageUrl(filePath: string, maxSide: number) {
  return `${endpoint()}${filePath}?tr=w-${maxSide},h-${maxSide},c-at_max,q-80`;
}

function endpoint() {
  return required(process.env.IMAGEKIT_URL_ENDPOINT, 'IMAGEKIT_URL_ENDPOINT').replace(/\/+$/, '');
}
