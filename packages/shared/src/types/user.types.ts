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
