import * as Sentry from '@sentry/react-native';
import { useMutation } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { useInvalidateMeals } from '@/hooks/use-meals';
import { ApiError, useApi } from '@/lib/api';
import type { CreateMealResponse, ImageKitUploadAuth } from '@/lib/meals';

const UPLOAD_URL = 'https://upload.imagekit.io/api/v1/files/upload';
/** Photos are shrunk so their longest side is at most this: plenty for the AI, quick on mobile data. */
const UPLOAD_MAX_SIDE = 1024;

/** A JPEG copy of the photo that fits in 1024×1024 (never enlarged), base64-encoded. */
async function compress(uri: string) {
  const original = await ImageManipulator.manipulate(uri).renderAsync();
  const longest = Math.max(original.width, original.height);
  const image =
    longest > UPLOAD_MAX_SIDE
      ? await ImageManipulator.manipulate(original)
          .resize(original.width >= original.height ? { width: UPLOAD_MAX_SIDE } : { height: UPLOAD_MAX_SIDE })
          .renderAsync()
      : original;
  const { base64 } = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  if (!base64) throw new Error('Compressing the photo returned no data');
  return base64;
}

/** Uploads straight to ImageKit with signed params from our API, and returns the file id. */
async function upload(base64: string, auth: ImageKitUploadAuth) {
  const form = new FormData();
  // ImageKit accepts the file as a base64 string. Expo's fetch can't send React Native's
  // { uri, name, type } file parts, and a string needs no extra native module.
  form.append('file', base64);
  form.append('fileName', 'meal.jpg');
  form.append('publicKey', auth.publicKey);
  form.append('signature', auth.signature);
  form.append('expire', String(auth.expire));
  form.append('token', auth.token);
  form.append('folder', auth.folder);

  const res = await fetch(UPLOAD_URL, { method: 'POST', body: form });
  const data = await res.json().catch(() => null);
  if (!res.ok || typeof data?.fileId !== 'string') {
    throw new Error(`ImageKit upload failed (${res.status}): ${data?.message ?? 'no file id'}`);
  }
  return data.fileId as string;
}

/**
 * Compresses and uploads a meal photo, then POST /api/meals, which saves the meal as
 * analyzing and starts the analysis. Resolves with the run to follow.
 */
export function useLogMeal() {
  const api = useApi();
  const invalidateMeals = useInvalidateMeals();

  return useMutation({
    mutationFn: async (photoUri: string) => {
      // One wide log per attempt: how long each stage took and, on failure, which one broke.
      const startedAt = Date.now();
      let stage: 'prepare' | 'upload' | 'create_meal' = 'prepare';
      const timings: Record<string, number> = {};
      const lap = (name: string, since: number) => (timings[`${name}_ms`] = Date.now() - since);

      try {
        const [photo, auth] = await Promise.all([
          compress(photoUri),
          api<ImageKitUploadAuth>('/api/uploads/imagekit-auth'),
        ]);
        lap('prepare', startedAt);

        stage = 'upload';
        const uploadStart = Date.now();
        const fileId = await upload(photo, auth);
        lap('upload', uploadStart);

        stage = 'create_meal';
        const createStart = Date.now();
        const result = await api<CreateMealResponse>('/api/meals', { method: 'POST', body: { fileId } });
        lap('create_meal', createStart);

        Sentry.logger.info('Meal photo submitted', {
          meal_id: result.meal.id,
          run_id: result.runId,
          photo_kb: Math.round((photo.length * 3) / 4 / 1024),
          duration_ms: Date.now() - startedAt,
          ...timings,
        });
        return result;
      } catch (err) {
        Sentry.logger.error('Meal photo submission failed', {
          stage,
          status: err instanceof ApiError ? err.status : 0,
          error_code: err instanceof ApiError ? (err.code ?? 'unknown') : 'client_error',
          error_message: err instanceof Error ? err.message : String(err),
          duration_ms: Date.now() - startedAt,
          ...timings,
        });
        throw err;
      }
    },
    // The new meal shows on Home right away, as analyzing.
    onSuccess: () => invalidateMeals(),
    onError: (err) => console.error('[scan] logging the meal failed:', err),
  });
}
