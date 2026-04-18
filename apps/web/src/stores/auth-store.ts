import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api-client';
import { clearAccessToken, setAccessToken } from '@/lib/auth-token-store';
import { getCsrfHeaders } from '@/lib/csrf-token';
import { getApiErrorMessage } from '@/lib/api-error';
import type { IUserResponse } from '@flowforge/shared';

interface AuthState {
  user: IUserResponse | null;
  isLoading: boolean;
  isResendingVerification: boolean;
  isAuthenticated: boolean;
  error: string | null;
  notice: string | null;
  pendingVerificationEmail: string | null;
  otpSentTo: string | null;
  isOtpSending: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isResendingVerification: false,
  isAuthenticated: false,
  error: null,
  notice: null,
  pendingVerificationEmail: null,
  otpSentTo: null,
  isOtpSending: false,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      setAccessToken(data.data.tokens.accessToken);
      return data.data.user;
    } catch (error: unknown) {
      clearAccessToken();
      return rejectWithValue(getApiErrorMessage(error, 'Login failed'));
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (input: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', input);
      return {
        email: input.email,
        requiresEmailVerification: Boolean(data?.data?.requiresEmailVerification),
      };
    } catch (error: unknown) {
      clearAccessToken();
      return rejectWithValue(getApiErrorMessage(error, 'Registration failed'));
    }
  },
);

export const resendVerificationEmail = createAsyncThunk(
  'auth/resendVerificationEmail',
  async (input: { email: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/resend-verification', input);
      return (
        data?.data?.message ||
        'If an unverified account exists, a new verification link has been sent.'
      );
    } catch (error: unknown) {
      clearAccessToken();
      return rejectWithValue(getApiErrorMessage(error, 'Failed to resend verification email'));
    }
  },
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me');
      return data.data;
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to fetch profile'));
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

export const requestOtp = createAsyncThunk(
  'auth/requestOtp',
  async (input: { email: string }, { rejectWithValue }) => {
    try {
      await api.post('/auth/otp/request', input);
      return input.email;
    } catch (error: unknown) {
      return rejectWithValue(getApiErrorMessage(error, 'Failed to send OTP'));
    }
  },
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (input: { email: string; otp: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/otp/verify', input);
      setAccessToken(data.data.tokens.accessToken);
      return data.data.user;
    } catch (error: unknown) {
      clearAccessToken();
      return rejectWithValue(getApiErrorMessage(error, 'OTP verification failed'));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    clearNotice(state) {
      state.notice = null;
    },
    clearPendingVerification(state) {
      state.pendingVerificationEmail = null;
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
        state.notice = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<IUserResponse>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.notice = null;
        state.pendingVerificationEmail = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.notice = null;
      })
      .addCase(
        register.fulfilled,
        (state, action: PayloadAction<{ email: string; requiresEmailVerification: boolean }>) => {
          state.isLoading = false;
          state.user = null;
          state.isAuthenticated = false;
          state.pendingVerificationEmail = action.payload.email;
          state.notice = `Verification email sent to ${action.payload.email}. Please verify before signing in.`;
        },
      )
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(resendVerificationEmail.pending, (state) => {
        state.isResendingVerification = true;
        state.error = null;
      })
      .addCase(resendVerificationEmail.fulfilled, (state, action: PayloadAction<string>) => {
        state.isResendingVerification = false;
        state.notice = action.payload;
      })
      .addCase(resendVerificationEmail.rejected, (state, action) => {
        state.isResendingVerification = false;
        state.error = action.payload as string;
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
        state.notice = null;
        state.pendingVerificationEmail = null;
        state.otpSentTo = null;
        state.isOtpSending = false;
      })
      .addCase(requestOtp.pending, (state) => {
        state.isOtpSending = true;
        state.error = null;
      })
      .addCase(requestOtp.fulfilled, (state, action: PayloadAction<string>) => {
        state.isOtpSending = false;
        state.otpSentTo = action.payload;
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.isOtpSending = false;
        state.error = action.payload as string;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action: PayloadAction<IUserResponse>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.otpSentTo = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearNotice, clearPendingVerification, clearOtpState } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
