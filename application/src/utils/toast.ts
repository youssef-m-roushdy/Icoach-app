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
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error
  ) {
    const err = error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
          errors?: { message?: string }[];
        };
      };
      message?: string;
    };

    if (err.response?.data?.message) {
      return err.response.data.message;
    }

    if (err.response?.data?.error) {
      return err.response.data.error;
    }

    if (err.response?.data?.errors?.[0]?.message) {
      return err.response.data.errors[0].message!;
    }

    if (err.message) {
      return err.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};