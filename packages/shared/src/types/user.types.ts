export interface IUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserResponse {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface IAuthTokens {
  accessToken: string;
}

export interface ILoginResponse {
  user: IUserResponse;
  tokens: IAuthTokens;
}

export type RegisterVerificationState = 'created' | 'resent';

export interface IRegisterResponse {
  user: IUserResponse;
  email: string;
  requiresEmailVerification: boolean;
  verificationState: RegisterVerificationState;
  verificationToken?: string;
}

export type AuthErrorCode =
  | 'EMAIL_UNVERIFIED'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'EMAIL_DELIVERY_UNAVAILABLE';
