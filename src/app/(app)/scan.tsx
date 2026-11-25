import * as Sentry from '@sentry/react-native';
import { useRealtimeRun } from '@trigger.dev/react-hooks';
import type { TaskOutput } from '@trigger.dev/sdk';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useIsFocused } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnalyzingOverlay, type ScanStep } from '@/components/scan/analyzing-overlay';
import { MACROS } from '@/constants/macros';
import { useLogMeal } from '@/hooks/use-log-meal';
import { useInvalidateMeals } from '@/hooks/use-meals';
import { ApiError } from '@/lib/api';
import type { AnalyzeStep, CreateMealResponse } from '@/lib/meals';
import { DAILY_SCAN_LIMIT } from '@/lib/scans';
import type { analyzeMeal } from '@/trigger/analyze-meal';

/** When the progress text moves from identifying the food to estimating its nutrition. */
const ESTIMATING_AFTER_MS = 4000;

/** Viewfinder corner brackets, as [position classes, border classes]. */
const CORNERS: [string, string][] = [
  ['left-6 top-6', 'border-l-[3px] border-t-[3px] rounded-tl-2xl'],
  ['right-6 top-6', 'border-r-[3px] border-t-[3px] rounded-tr-2xl'],
  ['bottom-6 left-6', 'border-b-[3px] border-l-[3px] rounded-bl-2xl'],
  ['bottom-6 right-6', 'border-b-[3px] border-r-[3px] rounded-br-2xl'],
];

/**
 * Camera permission → take a photo → review it → analyze. Analyzing uploads the photo, saves
 * the meal as analyzing and starts the analyze-meal task, which this screen follows live.
 */
export default function ScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [scan, setScan] = useState<CreateMealResponse | null>(null);
  const logMeal = useLogMeal();

  const reset = () => {
    setPhotoUri(null);
    setScan(null);
    logMeal.reset();
  };

  /** The system photo picker; works without camera permission. */
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch (err) {
      console.warn('[scan] picking a photo failed:', err);
      Sentry.logger.warn('Photo picker failed', { source: 'gallery', error_message: String(err) });
    }
  };

  // Photo states come first: a gallery photo doesn't need camera permission.
  let content: ReactNode;
  if (scan && photoUri) {
    content = <Analysis scan={scan} photoUri={photoUri} onReset={reset} />;
  } else if (photoUri) {
    content = (
      <Preview
        photoUri={photoUri}
        pending={logMeal.isPending}
        error={logMeal.error}
        onRetake={reset}
        onAnalyze={() => logMeal.mutate(photoUri, { onSuccess: setScan })}
      />
    );
  } else if (!permission) {
    content = <ActivityIndicator className="flex-1" color="#000" />;
  } else if (!permission.granted) {
    content = (
      <PermissionPrompt
        canAskAgain={permission.canAskAgain}
        onAllow={requestPermission}
        onPickFromGallery={pickFromGallery}
      />
    );
  } else {
    content = <Camera onCapture={setPhotoUri} onPickFromGallery={pickFromGallery} />;
  }

  return (
    <View className="flex-1 bg-white px-5 pb-6" style={{ paddingTop: insets.top + 8 }}>
      <StatusBar style="dark" />

      <Text className="mt-2 text-[28px] font-bold leading-[34px] tracking-tight text-black">
        {t('scan.title')}
      </Text>
      <Text className="mt-2 text-[15px] leading-[21px] text-neutral-500">{t('scan.subtitle')}</Text>

      {content}
    </View>
  );
}

function PermissionPrompt({
  canAskAgain,
  onAllow,
  onPickFromGallery,
}: {
  canAskAgain: boolean;
  onAllow: () => void;
  onPickFromGallery: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="mt-6 flex-1">
      <View className="flex-1 items-center justify-center rounded-3xl bg-neutral-50 px-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-white">
          <SymbolView
            name={{ ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' }}
            size={34}
            tintColor="#000"
          />
        </View>
        <Text className="mt-5 text-center text-xl font-bold tracking-tight text-black">
          {t('scan.permissionTitle')}
        </Text>
        <Text className="mt-2 text-center text-[15px] leading-[21px] text-neutral-500">
          {t('scan.permissionBody')}
        </Text>
      </View>

      {/* Once denied for good, only the system settings can grant it. */}
      <PrimaryButton
        label={canAskAgain ? t('scan.permissionAllow') : t('scan.permissionSettings')}
        onPress={canAskAgain ? onAllow : () => Linking.openSettings()}
      />
      <Pressable
        onPress={onPickFromGallery}
        accessibilityRole="button"
        className="mt-3 h-14 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] border-neutral-200 active:opacity-70">
        <SymbolView name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }} size={18} tintColor="#000" />
        <Text className="text-[17px] font-semibold text-black">{t('scan.gallery')}</Text>
      </Pressable>
    </View>
  );
}

function Camera({ onCapture, onPickFromGallery }: { onCapture: (uri: string) => void; onPickFromGallery: () => void }) {
  const { t } = useTranslation();
  const camera = useRef<CameraView>(null);
  // Release the camera while another tab is showing.
  const isFocused = useIsFocused();
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  const capture = async () => {
    if (!camera.current || capturing) return;
    setCapturing(true);
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.8 });
      if (picture?.uri) onCapture(picture.uri);
    } catch (err) {
      console.warn('[scan] taking the picture failed:', err);
      Sentry.logger.warn('Photo capture failed', { source: 'camera', error_message: String(err) });
    } finally {
      setCapturing(false);
    }
  };

  return (
    <>
      <View className="mt-6 flex-1 overflow-hidden rounded-3xl bg-neutral-900">
        {isFocused && (
          <CameraView
            ref={camera}
            style={{ flex: 1 }}
            facing="back"
            onCameraReady={() => setReady(true)}
          />
        )}
        {CORNERS.map(([position, border]) => (
          <View
            key={position}
            pointerEvents="none"
            className={`absolute h-10 w-10 border-white/90 ${position} ${border}`}
          />
        ))}
      </View>

      {/* Gallery on the left, shutter centered, an empty slot on the right to balance it. */}
      <View className="mt-5 flex-row items-center justify-between">
        <Pressable
          onPress={onPickFromGallery}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('scan.gallery')}
          className="h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 active:opacity-70">
          <SymbolView
            name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
            size={24}
            tintColor="#000"
          />
        </Pressable>

        <Pressable
          onPress={capture}
          disabled={!ready || capturing}
          accessibilityRole="button"
          accessibilityLabel={t('scan.capture')}
          className="h-[76px] w-[76px] items-center justify-center rounded-full border-4 border-black active:opacity-70 disabled:opacity-40">
          <View className="h-[60px] w-[60px] rounded-full bg-black" />
        </Pressable>

        <View className="h-14 w-14" />
      </View>
    </>
  );
}

function Preview({
  photoUri,
  pending,
  error,
  onRetake,
  onAnalyze,
}: {
  photoUri: string;
  pending: boolean;
  error: Error | null;
  onRetake: () => void;
  onAnalyze: () => void;
}) {
  const { t } = useTranslation();
  const limitReached = error instanceof ApiError && error.code === 'DAILY_LIMIT';

  if (pending) return <AnalyzingOverlay photoUri={photoUri} step="uploading" onCancel={onRetake} />;

  return (
    <>
      <View className="mt-6 flex-1 overflow-hidden rounded-3xl bg-neutral-100">
        <Image source={{ uri: photoUri }} style={{ flex: 1 }} contentFit="cover" />
      </View>

      {error && (
        <Text className="mt-4 text-center text-sm leading-5 text-red-600">
          {limitReached ? t('scan.limitBody', { count: DAILY_SCAN_LIMIT }) : t('scan.errorBody')}
        </Text>
      )}
      {/* The real reason, for whoever is running the dev build. */}
      {__DEV__ && error && !limitReached && (
        <Text selectable className="mt-2 text-center font-mono text-xs leading-[18px] text-red-600">
          {error.message}
        </Text>
      )}

      <View className="mt-5 flex-row gap-3">
        <Pressable
          onPress={onRetake}
          disabled={pending}
          accessibilityRole="button"
          className="h-14 flex-1 items-center justify-center rounded-xl border-[1.5px] border-neutral-200 active:opacity-70 disabled:opacity-40">
          <Text className="text-[17px] font-semibold text-black">{t('scan.retake')}</Text>
        </Pressable>
        <Pressable
          onPress={onAnalyze}
          disabled={pending || limitReached}
          accessibilityRole="button"
          className="h-14 flex-[2] flex-row items-center justify-center gap-2 rounded-xl bg-black active:opacity-80 disabled:opacity-40">
          <SymbolView name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }} size={18} tintColor="#fff" />
          <Text className="text-[17px] font-semibold text-white">{t('scan.analyze')}</Text>
        </Pressable>
      </View>
    </>
  );
}

/** Follows the analyze-meal run live through Trigger.dev Realtime. */
function Analysis({ scan, photoUri, onReset }: { scan: CreateMealResponse; photoUri: string; onReset: () => void }) {
  const { t } = useTranslation();
  const { run, error } = useRealtimeRun<typeof analyzeMeal>(scan.runId, {
    accessToken: scan.publicAccessToken,
    skipColumns: ['payload'],
  });

  // The model names the food and estimates its nutrition in one call, so the backend only
  // reports `analyzing` then `saving`. Split the wait on the clock so the steps keep moving.
  const [estimating, setEstimating] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setEstimating(true), ESTIMATING_AFTER_MS);
    return () => clearTimeout(id);
  }, []);

  // Refresh Home's meals as soon as the analysis ends, either way.
  const invalidateMeals = useInvalidateMeals();
  const finished = !!run?.isCompleted;
  useEffect(() => {
    if (finished) invalidateMeals();
  }, [finished, invalidateMeals]);

  // One log per analysis as the user saw it, including how long they waited.
  const [startedAt] = useState(Date.now);
  useEffect(() => {
    if (!run?.isCompleted) return;
    const context = { meal_id: scan.meal.id, run_id: scan.runId, wait_ms: Date.now() - startedAt };
    if (run.isSuccess && run.output) {
      Sentry.logger.info('Meal analysis completed', {
        ...context,
        item_count: run.output.items.length,
        calories: Math.round(run.output.items.reduce((sum, item) => sum + item.calories, 0)),
      });
    } else {
      const errorCode = String(run.metadata?.errorCode ?? 'AI_ERROR');
      // NOT_FOOD is the user's photo, not a bug.
      Sentry.logger[errorCode === 'NOT_FOOD' ? 'info' : 'error']('Meal analysis failed', {
        ...context,
        error_code: errorCode,
        run_status: run.status,
      });
    }
    // Only when the run first reaches a final state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.isCompleted]);

  useEffect(() => {
    if (!error) return;
    console.warn('[scan] realtime subscription failed:', error);
    Sentry.logger.warn('Meal analysis subscription failed', {
      meal_id: scan.meal.id,
      run_id: scan.runId,
      error_message: error.message,
    });
  }, [error, scan]);

  const goHome = () => {
    onReset();
    router.navigate('/home');
  };

  if (run?.isSuccess && run.output) {
    return <Result photoUri={photoUri} result={run.output} onHome={goHome} onScanAnother={onReset} />;
  }

  if (error || run?.isFailed) {
    const notFood = run?.metadata?.errorCode === 'NOT_FOOD';
    return (
      <View className="mt-6 flex-1">
        <View className="flex-1 items-center justify-center rounded-3xl bg-neutral-50 px-8">
          <SymbolView
            name={
              notFood
                ? { ios: 'fork.knife', android: 'no_meals', web: 'no_meals' }
                : { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' }
            }
            size={34}
            tintColor="#000"
          />
          <Text className="mt-4 text-center text-xl font-bold tracking-tight text-black">
            {notFood ? t('scan.notFoodTitle') : t('scan.errorTitle')}
          </Text>
          <Text className="mt-2 text-center text-[15px] leading-[21px] text-neutral-500">
            {notFood ? t('scan.notFoodBody') : t('scan.errorBody')}
          </Text>
        </View>
        <PrimaryButton label={t('common.retry')} onPress={onReset} />
      </View>
    );
  }

  const backendStep = run?.metadata?.step as AnalyzeStep | undefined;
  const step: ScanStep = backendStep === 'saving' ? 'finalizing' : estimating ? 'estimating' : 'identifying';
  return <AnalyzingOverlay photoUri={photoUri} step={step} onCancel={onReset} />;
}

function Result({
  photoUri,
  result,
  onHome,
  onScanAnother,
}: {
  photoUri: string;
  result: TaskOutput<typeof analyzeMeal>;
  onHome: () => void;
  onScanAnother: () => void;
}) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 });
  const { meal, items } = result;

  return (
    <View className="mt-6 flex-1">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: meal.imageUrl ?? photoUri }}
          placeholder={{ uri: photoUri }}
          style={{ height: 200, borderRadius: 24 }}
          contentFit="cover"
        />

        <View className="mt-4 flex-row items-center gap-1.5">
          <SymbolView
            name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
            size={16}
            tintColor="#16a34a"
          />
          <Text className="text-sm font-semibold text-green-600">{t('scan.done')}</Text>
        </View>
        <Text className="mt-1 text-[24px] font-bold tracking-tight text-black">{meal.name}</Text>

        <View className="mt-4 flex-row items-center gap-3 rounded-2xl border-[1.5px] border-neutral-200 p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-neutral-100">
            <SymbolView
              name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
              size={20}
              tintColor="#000"
            />
          </View>
          <Text className="text-[32px] font-bold tracking-tight text-black">{number.format(meal.calories)}</Text>
          <Text className="mt-2 text-[15px] text-neutral-500">{t('scan.kcal')}</Text>
        </View>

        <View className="mt-3 flex-row gap-3">
          {MACROS.map(({ key, targetKey, icon, color }) => (
            <View key={key} className="flex-1 rounded-2xl border-[1.5px] border-neutral-200 p-3.5">
              <SymbolView name={icon} size={14} tintColor={color} />
              <Text className="mt-2 text-lg font-bold text-black">{number.format(meal[targetKey])}g</Text>
              <Text className="text-xs text-neutral-500">{t(`onboarding.plan.${key}`)}</Text>
            </View>
          ))}
        </View>

        <View className="mt-4 gap-2 pb-2">
          {items.map((item, index) => (
            <View key={index} className="flex-row items-center rounded-2xl bg-neutral-50 px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className="text-[15px] font-semibold text-black">{item.name}</Text>
                <Text className="mt-0.5 text-xs text-neutral-500">
                  {[
                    item.quantity != null && `${number.format(item.quantity)} ${item.unit ?? ''}`.trim(),
                    item.grams != null && `${number.format(item.grams)} g`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
              <Text className="text-[15px] font-semibold text-black">
                {number.format(item.calories)} {t('scan.kcal')}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="mt-3 flex-row gap-3">
        <Pressable
          onPress={onScanAnother}
          accessibilityRole="button"
          className="h-14 flex-1 items-center justify-center rounded-xl border-[1.5px] border-neutral-200 active:opacity-70">
          <Text className="text-[16px] font-semibold text-black">{t('scan.scanAnother')}</Text>
        </Pressable>
        <Pressable
          onPress={onHome}
          accessibilityRole="button"
          className="h-14 flex-1 items-center justify-center rounded-xl bg-black active:opacity-80">
          <Text className="text-[16px] font-semibold text-white">{t('scan.goHome')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="mt-5 h-14 items-center justify-center rounded-xl bg-black active:opacity-80">
      <Text className="text-[17px] font-semibold text-white">{label}</Text>
    </Pressable>
  );
}
