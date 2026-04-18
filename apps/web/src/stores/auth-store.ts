import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api-client';
import { clearAccessToken, setAccessToken } from '@/lib/auth-token-store';
import { getCsrfHeaders } from '@/lib/csrf-token';
import { getApiErrorDetails } from '@/lib/api-error';
import type {
  AuthErrorCode,
  IRegisterResponse,
  IUserResponse,
  RegisterVerificationState,
} from '@flowforge/shared';

interface AuthState {
  user: IUserResponse | null;
  isLoading: boolean;
  isResendingVerification: boolean;
  isAuthenticated: boolean;
  error: string | null;
  errorCode: AuthErrorCode | null;
  notice: string | null;
  pendingVerificationEmail: string | null;
  pendingVerificationState: RegisterVerificationState | null;
  otpSentTo: string | null;
  isOtpSending: boolean;
}

interface AuthThunkError {
  message: string;
  code: AuthErrorCode | null;
}

const AUTH_ERROR_CODES: AuthErrorCode[] = [
  'EMAIL_UNVERIFIED',
  'EMAIL_ALREADY_REGISTERED',
  'EMAIL_DELIVERY_UNAVAILABLE',
];

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isResendingVerification: false,
  isAuthenticated: false,
  error: null,
  errorCode: null,
  notice: null,
  pendingVerificationEmail: null,
  pendingVerificationState: null,
  otpSentTo: null,
  isOtpSending: false,
};

const createAuthAsyncThunk = createAsyncThunk.withTypes<{ rejectValue: AuthThunkError }>();

function isAuthErrorCode(code?: string): code is AuthErrorCode {
  return Boolean(code && AUTH_ERROR_CODES.includes(code as AuthErrorCode));
}

function toAuthThunkError(error: unknown, fallback: string): AuthThunkError {
  const details = getApiErrorDetails(error, fallback);
  return {
    message: details.message,
    code: isAuthErrorCode(details.code) ? details.code : null,
  };
}

function setAuthError(state: AuthState, error: AuthThunkError | undefined) {
  state.error = error?.message ?? null;
  state.errorCode = error?.code ?? null;
}

function registerNotice(email: string, verificationState: RegisterVerificationState): string {
  if (verificationState === 'resent') {
    return `This email is already awaiting verification. We sent a fresh link to ${email}.`;
  }

  return `Verification email sent to ${email}. Please verify before signing in.`;
}

export const login = createAuthAsyncThunk<IUserResponse, { email: string; password: string }>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      setAccessToken(data.data.tokens.accessToken);
      return data.data.user as IUserResponse;
    } catch (error: unknown) {
      clearAccessToken();
      return rejectWithValue(toAuthThunkError(error, 'Login failed'));
    }
  },
);

export const register = createAuthAsyncThunk<
  IRegisterResponse,
  { email: string; password: string; name: string }
>('auth/register', async (input, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', input);
    return {
      ...(data.data as IRegisterResponse),
      email: data.data?.email || input.email,
    };
  } catch (error: unknown) {
    clearAccessToken();
    return rejectWithValue(toAuthThunkError(error, 'Registration failed'));
  }
});

export const resendVerificationEmail = createAuthAsyncThunk<string, { email: string }>(
  'auth/resendVerificationEmail',
  async (input, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/resend-verification', input);
      return (
        data?.data?.message ||
        'If an unverified account exists, a new verification link has been sent.'
      );
    } catch (error: unknown) {
      clearAccessToken();
      return rejectWithValue(toAuthThunkError(error, 'Failed to resend verification email'));
    }
  },
);

export const fetchProfile = createAuthAsyncThunk<IUserResponse, void>(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me');
      return data.data as IUserResponse;
    } catch (error: unknown) {
      return rejectWithValue(toAuthThunkError(error, 'Failed to fetch profile'));
    }
  },
);

export const logoutUser = createAsyncThunk('auth/logoutUser', async () => {
  try {
    await api.post('/auth/logout', {}, { headers: getCsrfHeaders() });
  } catch {
    // Clear local auth state even if server-side revocation fails.
  }

  clearAccessToken();
});

export const requestOtp = createAuthAsyncThunk<string, { email: string }>(
  'auth/requestOtp',
  async (input, { rejectWithValue }) => {
    try {
      await api.post('/auth/otp/request', input);
      return input.email;
    } catch (error: unknown) {
      return rejectWithValue(toAuthThunkError(error, 'Failed to send OTP'));
    }
  },
);

export const verifyOtp = createAuthAsyncThunk<IUserResponse, { email: string; otp: string }>(
  'auth/verifyOtp',
  async (input, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/otp/verify', input);
      setAccessToken(data.data.tokens.accessToken);
      return data.data.user as IUserResponse;
    } catch (error: unknown) {
      clearAccessToken();
      return rejectWithValue(toAuthThunkError(error, 'OTP verification failed'));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
      state.errorCode = null;
    },
    clearNotice(state) {
      state.notice = null;
    },
    clearPendingVerification(state) {
      state.pendingVerificationEmail = null;
      state.pendingVerificationState = null;
      state.notice = null;
    },
    clearOtpState(state) {
      state.otpSentTo = null;
      state.isOtpSending = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.errorCode = null;
        state.notice = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<IUserResponse>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.notice = null;
        state.error = null;
        state.errorCode = null;
        state.pendingVerificationEmail = null;
        state.pendingVerificationState = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        setAuthError(state, action.payload);
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.errorCode = null;
        state.notice = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<IRegisterResponse>) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.errorCode = null;
        state.pendingVerificationEmail = action.payload.email;
        state.pendingVerificationState = action.payload.verificationState;
        state.notice = registerNotice(action.payload.email, action.payload.verificationState);
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        setAuthError(state, action.payload);
      })
      .addCase(resendVerificationEmail.pending, (state) => {
        state.isResendingVerification = true;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(resendVerificationEmail.fulfilled, (state, action: PayloadAction<string>) => {
        state.isResendingVerification = false;
        state.notice = action.payload;
      })
      .addCase(resendVerificationEmail.rejected, (state, action) => {
        state.isResendingVerification = false;
        setAuthError(state, action.payload);
      })
      .addCase(fetchProfile.fulfilled, (state, action: PayloadAction<IUserResponse>) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchProfile.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.errorCode = null;
        state.notice = null;
        state.pendingVerificationEmail = null;
        state.pendingVerificationState = null;
        state.otpSentTo = null;
        state.isOtpSending = false;
      })
      .addCase(requestOtp.pending, (state) => {
        state.isOtpSending = true;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(requestOtp.fulfilled, (state, action: PayloadAction<string>) => {
        state.isOtpSending = false;
        state.otpSentTo = action.payload;
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.isOtpSending = false;
        setAuthError(state, action.payload);
      })
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.errorCode = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action: PayloadAction<IUserResponse>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        state.errorCode = null;
        state.otpSentTo = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        setAuthError(state, action.payload);
      });
  },
});

export const { clearError, clearNotice, clearPendingVerification, clearOtpState } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
