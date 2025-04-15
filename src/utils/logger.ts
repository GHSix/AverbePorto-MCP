import { ApiError, ValidationError, SessionError, ErrorResponseData } from '../errors/index.js';
import fetch from 'node-fetch';

export const logger = {
  info: (message: string, ...meta: any[]) => {
    console.info(new Date().toISOString(), '[INFO]', message, ...meta);
  },
  error: (message: string, error: Error, ...meta: any[]) => {
    console.error(
      new Date().toISOString(),
      '[ERROR]',
      message,
      {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error instanceof ApiError && {
          status: error.status,
          code: error.code,
          context: error.context,
        }),
        ...(error instanceof ValidationError && {
          field: error.field,
          value: error.value,
        }),
        ...(error instanceof SessionError && {
          sessionId: error.sessionId,
        }),
      },
      ...meta
    );
  },
  warn: (message: string, ...meta: any[]) => {
    console.warn(new Date().toISOString(), '[WARN]', message, ...meta);
  }
};

interface ApiResponse {
  status: number;
  headers: any;
  body: any;
  format: string;
}

export async function makeApiRequest(
  url: string,
  method: string,
  data: any,
  headers: any = {},
  format: string = 'json'
): Promise<ApiResponse> {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'User-Agent': `${process.env.APP_NAME || 'AverbePorto-MCP'}/${process.env.APP_VERSION || '1.1.0'}`,
        ...headers,
      },
      body: data,
    });

    let body;
    const contentType = response.headers.get('content-type');
    
    try {
      if (contentType?.includes('application/json')) {
        body = await response.json();
      } else if (contentType?.includes('text/xml') || format === 'xml') {
        body = await response.text();
        format = 'xml';
      } else if (contentType?.includes('text/csv') || format === 'csv') {
        body = await response.text();
        format = 'csv';
      } else {
        try {
          body = await response.json();
        } catch (jsonError) {
          logger.warn('Failed to parse response as JSON, falling back to text', { url, method });
          body = await response.text();
          format = 'text';
        }
      }
    } catch (parseError) {
      logger.error('Error parsing response body', parseError as Error, { url, method, contentType });
      try {
        body = await response.text();
        format = 'text';
      } catch (textError) {
        logger.error('Failed to read response body as text', textError as Error, { url, method });
        throw new ApiError(
          'Failed to parse response body',
          response.status,
          'PARSE_ERROR',
          'Response parsing',
          { status: response.status, headers: Object.fromEntries(response.headers) }
        );
      }
    }

    // Check for error status codes
    if (!response.ok) {
      throw new ApiError(
        `API request failed with status ${response.status}`,
        response.status,
        'HTTP_ERROR',
        `${method} ${url}`,
        { body, headers: Object.fromEntries(response.headers) }
      );
    }

    return {
      status: response.status,
      headers: response.headers,
      body,
      format
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    logger.error('API request failed', error as Error, { url, method });
    throw new ApiError(
      'API request failed',
      500,
      'REQUEST_ERROR',
      `${method} ${url}`,
      error
    );
  }
}

export function handleApiError(error: Error, message?: string, response?: any) {
  const errorData: ErrorResponseData = {
    message: message || error.message,
    type: error.name,
    timestamp: new Date().toISOString()
  };

  if (error instanceof ApiError) {
    Object.assign(errorData, {
      status: error.status,
      code: error.code,
      context: error.context,
      rawResponse: error.rawResponse
    });
  } else if (error instanceof ValidationError) {
    Object.assign(errorData, {
      field: error.field,
      value: error.value
    });
  } else if (error instanceof SessionError) {
    Object.assign(errorData, {
      sessionId: error.sessionId
    });
  }

  if (response) {
    Object.assign(errorData, {
      status: response.status,
      rawResponse: response.body
    });
  }

  const errorResponse = {
    content: [
      {
        type: "text" as const,
        text: message || error.message
      }
    ],
    data: {
      success: 0,
      error: errorData
    }
  };

  logger.error('API Error occurred', error, errorData);
  return errorResponse;
}

export function extractSessionCookie(headers: any): string | null {
  const cookieHeader = headers.get('set-cookie');
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/portal\[ses\]=([^;]+)/);
  return match ? match[1] : null;
}

export function isProtocol(input: string): boolean {
  return input.length === 40;
}

export function isKey(input: string): boolean {
  return input.length === 44;
}