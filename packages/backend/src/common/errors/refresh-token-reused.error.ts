import { AppError } from './app-error.js';

export class RefreshTokenReusedError extends AppError {
  constructor() {
    super('REFRESH_REVOKED', 'Session invalidated — please sign in again', 401);
  }
}
