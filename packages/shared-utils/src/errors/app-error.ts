import { ErrorCode } from './error-codes';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(params: {
    code: ErrorCode;
    message: string;
    statusCode: number;
    details?: unknown;
    isOperational?: boolean;
  }) {
    super(params.message);
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.details = params.details;
    this.isOperational = params.isOperational ?? true;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
