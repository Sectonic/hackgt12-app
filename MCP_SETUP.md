# Cedar-OS Expert MCP Server Setup

This project has been configured to use the Cedar-OS Expert MCP Server for enhanced development capabilities.

## Configuration

The MCP server configuration is stored in `mcp-config.json`:

```json
{
  "mcpServers": {
    "cedar-mcp": {
      "url": "https://mcpwithcedar-production.up.railway.app/jsonrpc",
      "description": "Cedar-OS Expert MCP Server"
    }
  }
}
```

## Setup Instructions

### 1. Configure Cursor Settings

Add the following configuration to your Cursor settings file located at `~/.cursor/settings.json`:

```json
{
  "mcpServers": {
    "cedar-mcp": {
      "url": "https://mcpwithcedar-production.up.railway.app/jsonrpc",
      "description": "Cedar-OS Expert MCP Server"
    }
  }
}
```

### 2. Restart Cursor

Close and reopen Cursor to apply the new MCP server configuration.

### 3. Verify Installation

In any file within Cursor, type a comment such as:

```javascript
// Help me create a Cedar chat component
```

The MCP server should provide Cedar-specific guidance in response.

## Usage

You can now ask the MCP server natural language questions related to Cedar development, such as:

- "Create a basic Cedar chat interface with streaming support"
- "Add voice input to my Cedar chat"
- "Implement a radial menu spell"
- "Help me debug my Cedar chat component"
- "Show me how to use Cedar's resizable panels"

## Features

The Cedar-OS Expert MCP Server provides:

- Cedar component guidance and examples
- Best practices for Cedar development
- Debugging assistance for Cedar components
- Integration help with existing React/Next.js projects
- Advanced Cedar features like spells, ornaments, and chat modes

## Project Structure

This project already includes Cedar components in the `src/cedar/` directory:

- `components/chatComponents/` - Various chat interface components
- `components/chatInput/` - Chat input components
- `components/chatMessages/` - Message rendering components
- `components/debugger/` - Debugging tools
- And many more Cedar-specific components

## Next Steps

1. Restart Cursor with the MCP configuration
2. Try asking the MCP server for help with Cedar development
3. Explore the existing Cedar components in the project
4. Use the MCP server to enhance your Cedar development workflow

For more information, visit the [Cedar-OS Documentation](https://docs.cedarcopilot.com/mcp-integration/mcp-server).


