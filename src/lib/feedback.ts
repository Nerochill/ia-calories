import * as Sentry from '@sentry/react-native';
import * as ImagePicker from 'expo-image-picker';
import type { TFunction } from 'i18next';

type FeedbackOptions = Partial<Sentry.FeedbackFormProps>;

// Adapts expo-image-picker to the form's picker type, which uses undefined rather than null.
const imagePicker: Sentry.ImagePicker = {
  launchImageLibraryAsync: async (options) => {
    const result = await ImagePicker.launchImageLibraryAsync(options);
    return {
      assets: result.assets?.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName ?? undefined,
        base64: asset.base64 ?? undefined,
      })),
    };
  },
};

const styles: Sentry.FeedbackFormStyles = {
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.3, color: '#000' },
  label: { marginBottom: 6, fontSize: 15, fontWeight: '600', color: '#000' },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    paddingHorizontal: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#000',
  },
  textArea: { height: 140, paddingTop: 14, textAlignVertical: 'top' },
  screenshotButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  screenshotText: { fontSize: 15, fontWeight: '600', color: '#000' },
  screenshotThumbnail: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
  submitButton: { height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#000' },
  submitButtonDisabled: { opacity: 0.5 },
  submitText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  cancelButton: { alignItems: 'center', paddingVertical: 16 },
  cancelText: { fontSize: 15, fontWeight: '600', color: '#525252' },
};

/** The form's text in the current language. */
const labels = (t: TFunction): FeedbackOptions => ({
  formTitle: t('feedback.title'),
  messageLabel: t('feedback.message'),
  messagePlaceholder: t('feedback.messagePlaceholder'),
  emailLabel: t('feedback.email'),
  emailPlaceholder: t('feedback.emailPlaceholder'),
  isRequiredLabel: t('feedback.required'),
  addScreenshotButtonLabel: t('feedback.addScreenshot'),
  removeScreenshotButtonLabel: t('feedback.removeScreenshot'),
  submitButtonLabel: t('feedback.submit'),
  cancelButtonLabel: t('common.cancel'),
  successMessageText: t('feedback.success'),
  errorTitle: t('feedback.errorTitle'),
  formError: t('feedback.formError'),
  emailError: t('feedback.emailError'),
  genericError: t('feedback.genericError'),
});

/** Sentry's User Feedback widget, styled for the app (which is light-only). Goes in `Sentry.init`. */
export const createFeedbackIntegration = (t: TFunction) =>
  Sentry.feedbackIntegration({
    colorScheme: 'light',
    showBranding: false,
    showName: false,
    imagePicker,
    styles,
    ...labels(t),
  });

/**
 * Opens the feedback widget. The widget reads its options each time it opens, so this refreshes
 * the text (the language can change after `Sentry.init`) and prefills the user's email so we can
 * reply. The user can clear it.
 */
export function openFeedback(t: TFunction, user: { name?: string | null; email?: string | null }) {
  const integration = Sentry.getClient()?.getIntegrationByName<ReturnType<typeof Sentry.feedbackIntegration>>(
    'MobileFeedback'
  );
  if (integration) {
    Object.assign(integration.options, labels(t), {
      useSentryUser: { name: user.name ?? '', email: user.email ?? '' },
    });
  }
  Sentry.showFeedbackForm();
}
