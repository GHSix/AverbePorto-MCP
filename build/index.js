import { McpServer, } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
// Initialize MCP server
const options = {
    name: 'AverbePorto-MCP',
    version: '1.0.0',
    capabilities: {
        tools: {},
    },
};
const server = new McpServer(options);
// API base URL and constants
const API_BASE_URL = 'https://apis.averbeporto.com.br/php/conn.php';
const USER_AGENT = `${options.name}/${options.version}`;
// Session store for cookies
const sessions = new Map();
// Helper function to determine if input is a protocol or key based on length
function isProtocol(input) {
    return input.length === 40;
}
function isKey(input) {
    return input.length === 44;
}
// Helper function to make API requests
async function makeApiRequest(url, method, data, headers = {}, format = 'json') {
    try {
        const response = await fetch(url, {
            method,
            headers: {
                'User-Agent': USER_AGENT,
                ...headers,
            },
            body: data,
        });
        let body;
        switch (format) {
            case 'xml':
            case 'csv':
                body = await response.text();
                break;
            default:
                body = await response.json();
        }
        return {
            status: response.status,
            headers: response.headers,
            body,
        };
    }
    catch (error) {
        console.error('API request error:', error);
        throw error;
    }
}
// Extract session cookie from response headers
function extractSessionCookie(headers) {
    const cookieHeader = headers.get('set-cookie');
    if (!cookieHeader)
        return null;
    const match = cookieHeader.match(/portal\[ses\]=([^;]+)/);
    return match ? match[1] : null;
}
// Login to AverbePorto API
server.tool('login', {
    user: z.string().describe('Username for AverbePorto API'),
    pass: z.string().describe('Password for AverbePorto API'),
    dump: z.number().optional().describe('Debug flag (1 or 2)'),
}, async ({ user, pass, dump }) => {
    const formData = new URLSearchParams();
    formData.append('mod', 'login');
    formData.append('comp', '5');
    formData.append('user', user);
    formData.append('pass', pass);
    if (dump !== undefined) {
        formData.append('dump', dump.toString());
        console.error('Debug mode enabled, dump level:', dump);
    }
    const response = await makeApiRequest(API_BASE_URL, 'POST', formData.toString(), {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    });
    if (dump !== undefined) {
        console.error('Raw API response:', {
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: response.body
        });
    }
    const sessionCookie = extractSessionCookie(response.headers);
    if (response.body.success === 1 && !response.body.logout && sessionCookie) {
        // Store session data
        const sessionId = Date.now().toString();
        sessions.set(sessionId, {
            cookie: sessionCookie,
            userName: response.body.C?.userName || 'unknown',
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week expiration
        });
        return {
            content: [
                {
                    type: 'text',
                    text: `Login successful for user: ${response.body.C?.userName || user}. Session ID: ${sessionId}`
                }
            ],
            data: {
                success: response.body.success,
                sessionId,
                userData: response.body.C,
            }
        };
    }
    else if (response.body.captcha_url) {
        return {
            content: [
                {
                    type: 'text',
                    text: 'Login failed: Captcha required. Please visit the website to solve the captcha.'
                }
            ],
            data: {
                success: 0,
                error: 'Captcha required',
                captchaUrl: response.body.captcha_url,
            }
        };
    }
    else {
        return {
            content: [
                {
                    type: "text",
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
                error: 'Authentication failed'
            }
        };
    }
});
// Upload file to AverbePorto API
server.tool('upload', {
    sessionId: z.string().describe('Session ID from login'),
    filePath: z.string().describe('Path to the file to upload'),
    recipient: z.string().optional().describe('Optional recipient type (E, F, T, D or empty)'),
    version: z.number().optional().describe('API version'),
}, async ({ sessionId, filePath, recipient, version }) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return {
            content: [{ type: 'text', text: 'Session not found or expired. Please login again.' }],
            data: {
                success: 0,
                error: 'Invalid session',
            }
        };
    }
    if (!fs.existsSync(filePath)) {
        return {
            content: [{ type: 'text', text: `File not found: ${filePath}` }],
            data: {
                success: 0,
                error: 'File not found',
            }
        };
    }
    const formData = new FormData();
    formData.append('comp', '5');
    formData.append('mod', 'Upload');
    formData.append('path', 'eguarda/php/');
    if (recipient !== undefined && recipient !== '') {
        formData.append('recipient', recipient);
    }
    if (version !== undefined) {
        formData.append('v', version.toString());
    }
    // Add file to form data
    formData.append('file', fs.createReadStream(filePath));
    const response = await makeApiRequest(API_BASE_URL, 'POST', formData, {
        'Cookie': `portal[ses]=${session.cookie}`,
    });
    if (response.body.success === 1) {
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
            errorMsg = `\nErrors: ${errors.map((e) => e.msg || 'Unknown error').join(', ')}`;
        }
        return {
            content: [
                {
                    type: 'text',
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
        return {
            content: [
                {
                    type: 'text',
                    text: `Upload failed: ${response.body.error?.msg || 'Unknown error'}`
                }
            ],
            data: {
                success: 0,
                error: response.body.error,
            }
        };
    }
});
// Consult protocol or key
server.tool('consultProtocol', {
    sessionId: z.string().describe('Session ID from login'),
    keys: z.array(z.string()).optional().describe('Array of keys (44 characters) and/or protocols to query - will be automatically sorted'),
    protocols: z.array(z.string()).optional().describe('Array of protocols (40 characters) and/or keys to query - will be automatically sorted'),
    outputFormat: z.enum(['json', 'xml', 'csv']).optional().describe('Output format'),
    download: z.boolean().optional().describe('Set download header'),
    delimiter: z.string().optional().describe('CSV delimiter'),
}, async ({ sessionId, keys, protocols, outputFormat, download, delimiter }) => {
    const session = sessions.get(sessionId);
    if (!session) {
        return {
            content: [{ type: 'text', text: 'Session not found or expired. Please login again.' }],
            data: {
                success: 0,
                error: 'Invalid session',
            }
        };
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
    if (processedKeys.length === 0 && processedProtocols.length === 0) {
        return {
            content: [{ type: 'text', text: 'No valid keys or protocols provided. Keys must be 44 characters and protocols 40 characters.' }],
            data: {
                success: 0,
                error: 'Invalid or missing search parameters',
            }
        };
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
    if (outputFormat) {
        queryParams.append('out', outputFormat);
    }
    if (download !== undefined) {
        queryParams.append('download', download ? '1' : '0');
    }
    if (delimiter) {
        queryParams.append('delim', delimiter);
    }
    const response = await makeApiRequest(API_BASE_URL, 'POST', queryParams.toString(), {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': `portal[ses]=${session.cookie}`,
    }, outputFormat || 'json');
    if (outputFormat === 'xml' || outputFormat === 'csv') {
        // For xml and csv, return the raw response
        return {
            content: [
                {
                    type: 'text',
                    text: response.body
                }
            ],
            data: {
                success: 1,
                rawResponse: response.body
            }
        };
    }
    else {
        // For JSON format
        if (response.body.success === 1) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Consultation successful. ${response.body.S?.length || 0} results: ${JSON.stringify(response.body.S)}`
                    }
                ],
                data: {
                    success: 1,
                    results: response.body.S,
                }
            };
        }
        else {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Consultation failed: ${response.body.error?.msg || 'Unknown error'}`
                    }
                ],
                data: {
                    success: 0,
                    error: response.body.error,
                }
            };
        }
    }
});
// Main function to run the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('AverbaPorto MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error in main():', error);
    process.exit(1);
});
