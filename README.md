# screen-link

Dependency visualization tool for monorepo (Next.js Frontend / NestJS BFF(GraphQL) / NestJS Backend(gRPC))

## Overview

Screen Link is a powerful static analysis tool that maps dependencies across your monorepo architecture. It traces the flow from **screens (Next.js Routes)** → **GraphQL operations** → **BFF Resolvers** → **gRPC services**, helping you understand how API changes impact your frontend screens.

## Features

- 🔍 **Static Analysis**: No runtime changes needed in your applications
- 📊 **Visual Dependency Graph**: Interactive visualization with Reaflow
- 🎯 **Impact Analysis**: Instantly identify which screens are affected by API changes
- 🔄 **Diff Support**: Compare dependency maps between versions
- 🎨 **Elegant Themes**: Beautiful dark/light themes with Japanese aesthetic
- 🚀 **CLI & Web Interface**: Use as CLI tool or web application

## Architecture Support

- **Frontend**: Next.js (App Router & Pages Router)
- **BFF**: NestJS with GraphQL resolvers
- **Backend**: NestJS with gRPC services
- **GraphQL**: `gql` tagged templates, `.graphql` files, generated hooks
- **gRPC**: `.proto` files with service definitions

## Quick Start

1. **Install dependencies**:
```bash
npm install
```

2. **Configure your project** in `screen-link.config.json`:
```json
{
  "rootDir": ".",
  "apps": {
    "web": {
      "type": "nextjs",
      "path": "apps/web",
      "namespace": "web"
    }
  },
  "packages": {
    "bff": {
      "type": "nestjs",
      "path": "apps/bff"
    }
  },
  "protos": {
    "path": "packages/protos"
  }
}
```

3. **Analyze your codebase**:
```bash
npm run build
node packages/cli/dist/cli.js analyze
```

4. **View dependencies**:
```bash
node packages/cli/dist/cli.js view --filter "/orders/*"
```

5. **Check API impact**:
```bash
node packages/cli/dist/cli.js impact "gql:mutation.createOrder"
```

## CLI Commands

### Analyze
Generate dependency map from your codebase:
```bash
screen-link analyze [options]
```

Options:
- `-c, --config <path>`: Configuration file path
- `-o, --output <path>`: Output file path (default: map.json)
- `--verbose`: Enable verbose logging

### View
Filter and display dependency graph:
```bash
screen-link view [options]
```

Options:
- `-f, --filter <pattern>`: Screen filter (supports wildcards)
- `-l, --layers <layers>`: Comma-separated layers to show
- `-h, --hops <number>`: Hop limit from selected nodes

### Impact
Analyze impact of API changes:
```bash
screen-link impact <api> [options]
```

### Diff
Compare two dependency maps:
```bash
screen-link diff <old-map> <new-map> [options]
```

## Configuration

The tool uses `screen-link.config.json` for configuration. Key sections:

- **apps**: Next.js applications with their paths and namespaces
- **packages**: NestJS packages (BFF/Backend services)
- **protos**: gRPC protocol buffer definitions
- **analysis**: File patterns, decorators, and parsing options
- **output**: Output format and filtering options

## How It Works

1. **File Scanning**: Recursively scans configured directories
2. **AST Parsing**: Uses Babel to parse TypeScript/JavaScript files
3. **Pattern Recognition**: Identifies routes, GraphQL operations, resolvers, and gRPC services
4. **Dependency Linking**: Connects components using heuristics and naming conventions
5. **Graph Generation**: Outputs structured dependency map
6. **Visualization**: Renders interactive graph with filtering capabilities

## Example Output

```json
{
  "version": "1.0",
  "nodes": [
    {
      "id": "screen:/orders",
      "type": "screen",
      "label": "/orders",
      "group": "screens",
      "meta": { "file": "apps/web/app/orders/page.tsx" }
    },
    {
      "id": "gql:mutation.createOrder",
      "type": "gqlField",
      "label": "mutation.createOrder",
      "group": "graphql"
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "screen:/orders",
      "to": "gql:mutation.createOrder"
    }
  ],
  "index": {
    "apiToScreens": {
      "gql:mutation.createOrder": ["screen:/orders"]
    }
  }
}
```

## Limitations

- Static analysis only - no runtime behavior tracking
- Heuristic-based linking may require manual validation
- Large codebases may need performance optimization
- Dynamic imports and runtime GraphQL queries are not fully supported

## Development

This project uses a monorepo structure with Turbo:

- `packages/cli`: Command-line interface
- `packages/analyzer`: Static analysis engine
- `packages/ui`: React components for visualization
- `apps/web`: Next.js web application

To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests and documentation
5. Submit a pull request

## License

MIT License - see LICENSE file for details.