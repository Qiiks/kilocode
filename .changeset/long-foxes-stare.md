---
"kilo-code": major
---

feat(mcp): add streamable mcp support

Adds support for streamable HTTP MCP servers with improved configuration validation and backward compatibility for legacy HTTP configurations.

## Features

- **Streamable HTTP Support**: Added new "streamable-http" server type that enables streaming capabilities for HTTP-based MCP servers
- **Legacy Compatibility**: Automatically maps legacy "http" type configurations to "streamable-http" for seamless migration
- **Enhanced Validation**: Improved server configuration validation with better error messages and type inference
- **Unified Schema**: Consolidated server configuration schemas with proper field validation to prevent mixed configuration errors

## Improvements

- **Type Inference**: Automatic server type inference based on provided fields (command for stdio, url for HTTP-based servers)
- **Better Error Handling**: More descriptive error messages for configuration validation failures
- **Configuration Validation**: Enhanced validation to prevent mixing stdio and HTTP fields in the same configuration
- **Logging**: Added detailed console logging for configuration processing and validation steps

## Technical Changes

- Replaced union-based configuration schema with refined schema using `z.literal()` for better type safety
- Added StreamableHTTPClientTransport support for streamable HTTP connections
- Implemented proper error handling for streamable HTTP transport connections
- Enhanced server configuration parsing with automatic type mapping and validation
