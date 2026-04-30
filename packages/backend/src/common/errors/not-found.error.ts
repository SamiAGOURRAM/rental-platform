import { AppError } from './app-error.js';

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', id ? `${resource} with id '${id}' not found` : `${resource} not found`, 404);
  }
}
