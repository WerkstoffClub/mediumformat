import { Role } from '../constants/roles';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
