import client from './client';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  admin: { id: string; username: string; role: string };
}

export const authApi = {
  login: (username: string, password: string): Promise<LoginResult> =>
    client.post('/admin-auth/login', { username, password }),
};
