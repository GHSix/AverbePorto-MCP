import { z } from 'zod';
import fs from 'fs';
import FormData from 'form-data';
import { makeApiRequest } from '../utils/logger.js';
import { sessionStore } from '../utils/session.js';
import { ValidationError, SessionError } from '../errors/index.js';
const API_BASE_URL = 'https://apis.averbeporto.com.br/php/conn.php';
export const uploadTool = {
    name: 'upload',
    description: 'Uploads a specified file to the AverbePorto API for processing. Requires an active `sessionId` obtained from the `login` tool. Returns the processing status, including counts of processed/duplicated/rejected/denied items, generated protocol numbers, and any errors encountered.',
    inputSchema: {
        sessionId: z.string().describe('Session ID from login'),
        filePath: z.string().describe('Path to the file to upload'),
    },
    handler: async ({ sessionId, filePath }) => {
        const session = sessionStore.get(sessionId);
        if (!session) {
            throw new SessionError('Session not found or expired. Please login again.', sessionId);
        }
        if (!fs.existsSync(filePath)) {
            throw new ValidationError(`File not found: ${filePath}`, 'filePath', filePath);
        }
        const formData = new FormData();
        formData.append('comp', '5');
        formData.append('mod', 'Upload');
        formData.append('path', 'eguarda/php/');
        formData.append('file', fs.createReadStream(filePath));
        const response = await makeApiRequest(API_BASE_URL, 'POST', formData, {
            'Cookie': `portal[ses]=${session.cookie}`,
        });
        // Check if body exists and is an object before accessing properties
        if (response.body && typeof response.body === 'object' && response.body.success === 1) {
            const stats = response.body.S || { P: 0, D: 0, R: 0, N: 0 };
            const statusMsg = [
                `Processed: ${stats.P || 0}`,
                `Duplicated: ${stats.D || 0}`,
                `Rejected: ${stats.R || 0}`,
                `Denied: ${stats.N || 0}`
            ].join(', ');
            let protocolMsg = '';
            if (stats.P > 0 && response.body.prot) {
                protocolMsg = `\nProtocols: ${Array.isArray(response.body.prot) ? response.body.prot.join(', ') : response.body.prot}`;
            }
            let errorMsg = '';
            if ((stats.R > 0 || stats.N > 0) && response.body.error) {
                const errors = Array.isArray(response.body.error) ? response.body.error : [response.body.error];
                errorMsg = `\nErrors: ${errors.map((e) => e?.msg || JSON.stringify(e) || 'Unknown error').join(', ')}`;
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Upload status: ${statusMsg}${protocolMsg}${errorMsg}`
                    }
                ],
                data: {
                    success: 1,
                    protocol: response.body.prot,
                    stats: response.body.S,
                    errors: response.body.error
                }
            };
        }
        else {
            throw new Error('Upload failed: Invalid response format');
        }
    }
};
