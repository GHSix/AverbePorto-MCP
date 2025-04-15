import { z } from 'zod';
import { makeApiRequest, extractSessionCookie, logger } from '../utils/logger.js';
import { sessionStore } from '../utils/session.js';

const API_BASE_URL = 'https://apis.averbeporto.com.br/php/conn.php';

interface LoginParams {
  user: string;
  pass: string;
  dump?: number;
}

export const loginTool = {
  name: 'login',
  description: 'Authenticates a user with the AverbePorto API using their username and password. Establishes a session and returns a unique `sessionId` required for subsequent API calls.',
  inputSchema: {
    user: z.string().describe('Username for AverbePorto API'),
    pass: z.string().describe('Password for AverbePorto API'),
    dump: z.number().optional().describe('Debug flag (1 or 2)'),
  },
  handler: async ({ user, pass, dump }: LoginParams) => {
    const formData = new URLSearchParams();
    formData.append('mod', 'login');
    formData.append('comp', '5');
    formData.append('user', user);
    formData.append('pass', pass);

    if (dump !== undefined) {
      formData.append('dump', dump.toString());
      logger.info('Debug mode enabled, dump level:', dump);
    }

    const response = await makeApiRequest(
      API_BASE_URL,
      'POST',
      formData.toString(),
      {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      }
    );

    if (dump !== undefined) {
      logger.info('Raw API response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: response.body
      });
    }

    const sessionCookie = extractSessionCookie(response.headers);

    // Check if body exists and is an object before accessing properties
    if (response.body && typeof response.body === 'object' && response.body.success === 1 && !response.body.logout && sessionCookie) {
      // Store session data
      const sessionId = Date.now().toString();
      sessionStore.set(sessionId, {
        cookie: sessionCookie,
        userName: response.body.C?.userName || 'unknown',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week expiration
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `Login successful for user: ${response.body.C?.userName || user}. Session ID: ${sessionId}`
          }
        ],
        data: {
          success: response.body.success,
          sessionId,
          userData: response.body.C,
        }
      };
    } else if (response.body && typeof response.body === 'object' && response.body.captcha_url) {
      return {
        content: [
          {
            type: "text" as const,
            text: 'Login failed: Captcha required. Please visit the website to solve the captcha.'
          }
        ],
        data: {
          success: 0,
          error: 'Captcha required',
          captchaUrl: response.body.captcha_url,
        }
      };
    } else {
      const errorBody = response.body && typeof response.body === 'object' ? response.body : { error: 'Unknown error or non-JSON response' };
      return {
        content: [
          {
            type: "text" as const,
            text: dump
              ? `Login failed: Invalid credentials or session expired.\nDebug info: ${JSON.stringify({
                  status: response.status,
                  headers: Object.fromEntries(response.headers),
                  body: response.body
                }, null, 2)}`
              : 'Login failed: Invalid credentials or session expired.'
          }
        ],
        data: {
          success: 0,
          error: 'Authentication failed',
          rawResponse: response.body
        }
      };
    }
  }
};