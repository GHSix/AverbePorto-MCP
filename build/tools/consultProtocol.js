import { z } from 'zod';
import { makeApiRequest, isKey, isProtocol } from '../utils/logger.js';
import { sessionStore } from '../utils/session.js';
import { SessionError, ValidationError } from '../errors/index.js';
const API_BASE_URL = 'https://apis.averbeporto.com.br/php/conn.php';
export const consultProtocolTool = {
    name: 'consultProtocol',
    description: 'Consults the AverbePorto API to retrieve details associated with one or more document access keys (44 digits) or protocol numbers (40 digits). Requires an active `sessionId`.',
    inputSchema: {
        sessionId: z.string().describe('Session ID from login'),
        keys: z.array(z.string()).optional().describe('Array of keys (44 characters) and/or protocols to query - will be automatically sorted'),
        protocols: z.array(z.string()).optional().describe('Array of protocols (40 characters) and/or keys to query - will be automatically sorted'),
        download: z.boolean().optional().describe('Set download header'),
        delimiter: z.string().optional().describe('CSV delimiter'),
    },
    handler: async ({ sessionId, keys, protocols, download, delimiter }) => {
        const session = sessionStore.get(sessionId);
        if (!session) {
            throw new SessionError('Session not found or expired. Please login again.', sessionId);
        }
        let processedKeys = [];
        let processedProtocols = [];
        // Process the input arrays if provided
        if (keys) {
            keys.forEach(key => {
                if (isKey(key)) {
                    processedKeys.push(key);
                }
                else if (isProtocol(key)) {
                    processedProtocols.push(key);
                }
            });
        }
        if (protocols) {
            protocols.forEach(protocol => {
                if (isProtocol(protocol)) {
                    processedProtocols.push(protocol);
                }
                else if (isKey(protocol)) {
                    processedKeys.push(protocol);
                }
            });
        }
        // Remove duplicates
        processedKeys = [...new Set(processedKeys)];
        processedProtocols = [...new Set(processedProtocols)];
        if (processedKeys.length === 0 && processedProtocols.length === 0) {
            throw new ValidationError('No valid keys or protocols provided. Keys must be 44 characters and protocols 40 characters.', 'keys/protocols', { keys, protocols });
        }
        const queryParams = new URLSearchParams();
        queryParams.append('comp', '5');
        queryParams.append('mod', 'Protocolo');
        queryParams.append('path', 'atwe/php/');
        // Add processed keys and protocols to query parameters
        processedKeys.forEach(key => {
            queryParams.append('chave[]', key);
        });
        processedProtocols.forEach(protocol => {
            queryParams.append('protocolo[]', protocol);
        });
        // Add optional parameters
        if (download !== undefined) {
            queryParams.append('download', download ? '1' : '0');
        }
        if (delimiter) {
            queryParams.append('delim', delimiter);
        }
        const response = await makeApiRequest(API_BASE_URL, 'POST', queryParams.toString(), {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Cookie': `portal[ses]=${session.cookie}`,
        });
        if (response.body && typeof response.body === 'object') {
            if (response.body.success === 1) {
                const results = response.body.S || [];
                const resultCount = Array.isArray(results) ? results.length : (results ? 1 : 0);
                return {
                    content: [
                        {
                            type: "text",
                            text: `Consultation successful. ${resultCount} results found.`
                        }
                    ],
                    data: {
                        success: 1,
                        results: results,
                        rawResponse: response.body
                    }
                };
            }
            else {
                const errorInfo = response.body.error?.msg || JSON.stringify(response.body.error) || 'Unknown error';
                return {
                    content: [
                        {
                            type: "text",
                            text: `Consultation failed: ${errorInfo}`
                        }
                    ],
                    data: {
                        success: 0,
                        error: response.body.error || { msg: 'Unknown error' },
                        rawResponse: response.body
                    }
                };
            }
        }
        else {
            throw new Error('Consultation failed: Received unexpected response format or could not parse body.');
        }
    }
};
