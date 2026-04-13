export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error !== 'object' || error === null) {
    return fallback;
  }

  const maybeError = error as {
    message?: string;
    response?: {
      data?: {
        error?: string;
        context?: {
          errors?: string[];
        };
      };
    };
  };

  const contextErrors = maybeError.response?.data?.context?.errors;
  if (Array.isArray(contextErrors) && contextErrors.length > 0) {
    return contextErrors.join(', ');
  }

  const apiError = maybeError.response?.data?.error;
  if (typeof apiError === 'string' && apiError.trim().length > 0) {
    return apiError;
  }

  if (typeof maybeError.message === 'string' && maybeError.message.trim().length > 0) {
    return maybeError.message;
  }

  return fallback;
}
