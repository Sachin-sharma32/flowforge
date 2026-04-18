export interface ApiErrorDetails {
  message: string;
  code?: string;
}

export function getApiErrorDetails(error: unknown, fallback: string): ApiErrorDetails {
  if (typeof error !== 'object' || error === null) {
    return { message: fallback };
  }

  const maybeError = error as {
    message?: string;
    response?: {
      data?: {
        error?: string;
        context?: {
          code?: string;
          errors?: string[];
        };
      };
    };
  };

  const code = maybeError.response?.data?.context?.code;
  const contextErrors = maybeError.response?.data?.context?.errors;
  if (Array.isArray(contextErrors) && contextErrors.length > 0) {
    return {
      message: contextErrors.join(', '),
      ...(typeof code === 'string' && code.trim().length > 0 ? { code } : {}),
    };
  }

  const apiError = maybeError.response?.data?.error;
  if (typeof apiError === 'string' && apiError.trim().length > 0) {
    return {
      message: apiError,
      ...(typeof code === 'string' && code.trim().length > 0 ? { code } : {}),
    };
  }

  if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
    return {
      message: maybeError.message,
      ...(typeof code === 'string' && code.trim().length > 0 ? { code } : {}),
    };
  }

  return {
    message: fallback,
    ...(typeof code === 'string' && code.trim().length > 0 ? { code } : {}),
  };
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorDetails(error, fallback).message;
}
