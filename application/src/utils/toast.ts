import Toast from 'react-native-toast-message';

type ToastPosition = 'top' | 'bottom';
type ToastType = 'success' | 'error' | 'info';

interface ShowToastOptions {
  title: string;
  message?: string;
  position?: ToastPosition;
  visibilityTime?: number;
}

const showToast = ({
  type,
  title,
  message,
  position = 'top',
  visibilityTime = 3000,
}: ShowToastOptions & { type: ToastType }) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position,
    visibilityTime,
  });
};

// 🟢 Success Toast
export const showSuccessToast = ({
  title,
  message,
  position = 'top',
  visibilityTime = 3000,
}: ShowToastOptions) => {
  showToast({
    type: 'success',
    title,
    message,
    position,
    visibilityTime,
  });
};

// 🔴 Error Toast
export const showErrorToast = ({
  title,
  message,
  position = 'top',
  visibilityTime = 4000,
}: ShowToastOptions) => {
  showToast({
    type: 'error',
    title,
    message,
    position,
    visibilityTime,
  });
};

// 🔵 Info Toast
export const showInfoToast = ({
  title,
  message,
  position = 'top',
  visibilityTime = 3000,
}: ShowToastOptions) => {
  showToast({
    type: 'info',
    title,
    message,
    position,
    visibilityTime,
  });
};

// 🧹 Hide Toast manually
export const hideToast = () => {
  Toast.hide();
};

// ⚠️ Extract readable error message safely
export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (typeof error !== 'object' || error === null) {
    return 'Something went wrong. Please try again.';
  }

  const err = error as any;
  const errorData = err.response?.data || err.data;

  if (errorData) {
    // 1. Handle nested validation details: { error: { details: [{ message: "..." }] } }
    if (errorData.error?.details && Array.isArray(errorData.error.details)) {
      const messages = errorData.error.details
        .map((e: any) => e.message || e.msg || (typeof e === 'string' ? e : JSON.stringify(e)));
      if (messages.length > 0) return messages.join('\n');
    }

    // 2. Handle flat errors array: { errors: [{ msg: "..." }] }
    if (errorData.errors && Array.isArray(errorData.errors)) {
      const messages = errorData.errors
        .map((e: any) => e.message || e.msg || (typeof e === 'string' ? e : JSON.stringify(e)));
      if (messages.length > 0) return messages.join('\n');
    }

    // 3. Handle direct array response
    if (Array.isArray(errorData)) {
      const messages = errorData
        .map((e: any) => e.message || e.msg || (typeof e === 'string' ? e : JSON.stringify(e)));
      if (messages.length > 0) return messages.join('\n');
    }

    // 4. Return direct string properties if available
    if (typeof errorData.error === 'string') {
      return errorData.error;
    }

    if (typeof errorData.message === 'string') {
      return errorData.message;
    }
  }

  if (err.message && typeof err.message === 'string') {
    return err.message;
  }

  return 'Something went wrong. Please try again.';
};