import type { ErrorRequestHandler } from 'express';
import { HttpError } from './http-error';

function isClientRequestError(error: unknown): boolean {
  if (!(error instanceof SyntaxError) || !('status' in error)) {
    return false;
  }

  return error.status === 400;
}

function isBookingOverlapError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23P01';
}

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  if (isBookingOverlapError(error)) {
    response.status(409).json({
      error: {
        code: 'BOOKING_CONFLICT',
        message: 'The requested equipment is not available for the selected dates.',
      },
    });
    return;
  }

  if (isClientRequestError(error)) {
    response.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'Request body must contain valid JSON.',
      },
    });
    return;
  }

  console.error('Unhandled request error:', error);
  response.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    },
  });
};
