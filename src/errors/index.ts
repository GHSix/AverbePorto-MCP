export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
    public context?: string,
    public rawResponse?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SessionError extends Error {
  constructor(
    message: string,
    public sessionId?: string
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

export interface ErrorResponseData {
  message: string;
  type: string;
  timestamp: string;
  status?: number;
  code?: string;
  context?: string;
  rawResponse?: any;
  field?: string;
  value?: any;
  sessionId?: string;
}