import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './utils/logger.js';
import { 
  loginTool,
  uploadTool,
  consultProtocolTool,
  decomposeKeyTool,
  retrieveDocumentTool 
} from './tools/index.js';

// Initialize MCP server
const options = {
  name: 'AverbePorto-MCP',
  version: '1.1.0',
  capabilities: {
    tools: {},
  },
};

const server = new McpServer(options);

// Register tools
server.tool(loginTool.name, loginTool.description, loginTool.inputSchema, loginTool.handler);
server.tool(uploadTool.name, uploadTool.description, uploadTool.inputSchema, uploadTool.handler);
server.tool(consultProtocolTool.name, consultProtocolTool.description, consultProtocolTool.inputSchema, consultProtocolTool.handler);
server.tool(decomposeKeyTool.name, decomposeKeyTool.description, decomposeKeyTool.inputSchema, decomposeKeyTool.handler);
server.tool(retrieveDocumentTool.name, retrieveDocumentTool.description, retrieveDocumentTool.inputSchema, retrieveDocumentTool.handler);

// Main function to run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('AverbePorto MCP Server running on stdio');
}

main().catch((error) => {
  logger.error('Fatal error in main()', error);
  process.exit(1);
});
