import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api-client';
import { clearAccessToken, setAccessToken } from '@/lib/auth-token-store';
import { getCsrfHeaders } from '@/lib/csrf-token';
import type { IUserResponse } from '@flowforge/shared';

interface AuthState {
  user: IUserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/login', credentials);
      setAccessToken(data.data.tokens.accessToken);
      return data.data.user;
    } catch (error: any) {
      clearAccessToken();
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  },
);

export const register = createAsyncThunk(
  'auth/register',
  async (input: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.post('/auth/register', input);
      setAccessToken(data.data.tokens.accessToken);
      return data.data.user;
    } catch (error: any) {
      clearAccessToken();
      return rejectWithValue(error.response?.data?.error || 'Registration failed');
    }
  },
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/auth/me');
      return data.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch profile');
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

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<IUserResponse>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<IUserResponse>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
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
      });
  },
});

export const { clearError } = authSlice.actions;
export const authReducer = authSlice.reducer;
