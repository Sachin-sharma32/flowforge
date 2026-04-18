export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;
}

export class ValidationError extends AppError {
  readonly statusCode = 422;
  readonly isOperational = true;
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly isOperational = true;
}

export class RateLimitError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;
}

export class PaymentRequiredError extends AppError {
  readonly statusCode = 402;
  readonly isOperational = true;
}

export class ServiceUnavailableError extends AppError {
  readonly statusCode = 503;
  readonly isOperational = true;
}

export class UnknownStepTypeError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(stepType: string) {
    super(`Unknown step type: ${stepType}`, { stepType });
  }
}
