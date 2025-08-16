# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Screen Link is a dependency visualization tool for monorepo architectures. It performs static analysis to map dependencies from Next.js screens → GraphQL operations → NestJS resolvers → gRPC services. The tool helps identify which frontend screens are impacted by API changes.

## Repository Structure

This is a Turbo monorepo with the following structure:
- `packages/cli/` - Command-line interface (Commander.js, TypeScript)
- `packages/analyzer/` - Static analysis engine (Babel AST, TypeScript)
- `packages/ui/` - React components for visualization (Reaflow, TypeScript)
- `apps/web/` - Next.js web application 
- `screen-link.config.json` - Configuration file for analysis settings

## Development Setup

### Common Commands
- `npm install` - Install all dependencies
- `npm run build` - Build all packages
- `npm run dev` - Start development mode for all packages
- `npm run lint` - Run ESLint across all packages
- `npm run typecheck` - Run TypeScript type checking

### CLI Commands
- `node packages/cli/dist/cli.js analyze` - Analyze codebase and generate map.json
- `node packages/cli/dist/cli.js view --filter "/orders/*"` - View filtered dependencies
- `node packages/cli/dist/cli.js impact "gql:mutation.createOrder"` - Show API impact
- `node packages/cli/dist/cli.js diff old.json new.json` - Compare dependency maps

### Package-specific Commands
- `cd packages/cli && npm run dev` - Watch CLI package in development
- `cd packages/analyzer && npm run test` - Run analyzer tests
- `cd apps/web && npm run dev` - Start Next.js development server

## Architecture

### Core Components
1. **FileScanner** (`packages/analyzer/src/utils/file-scanner.ts`) - Scans files based on patterns
2. **ASTParser** (`packages/analyzer/src/utils/ast-parser.ts`) - Parses TypeScript/JavaScript using Babel
3. **NextJSAnalyzer** - Extracts routes from App Router and Pages Router
4. **GraphQLAnalyzer** - Finds gql tagged templates and .graphql files
5. **NestJSAnalyzer** - Identifies @Resolver, @Query, @Mutation decorators
6. **GrpcAnalyzer** - Parses .proto files for service definitions
7. **AnalysisEngine** - Orchestrates analysis and builds dependency map

### Data Flow
1. Configuration loaded from `screen-link.config.json`
2. Files scanned using glob patterns
3. AST parsing for TypeScript/JavaScript files
4. Individual analyzers extract domain-specific information
5. Dependencies linked using heuristics and naming conventions
6. Final map.json generated with nodes, edges, and index

### Key Patterns
- Use TypeScript strict mode throughout
- Babel for AST parsing (not TypeScript compiler API)
- Heuristic-based dependency linking (e.g., method name matching)
- Structured error handling with warnings collection
- Configurable analysis patterns via config file

## Configuration

The tool is configured via `screen-link.config.json`:
- `apps` - Next.js applications (type: "nextjs")
- `packages` - NestJS services (type: "nestjs") 
- `protos` - gRPC protocol definitions path
- `analysis.includePatterns` - File patterns to analyze
- `analysis.excludePatterns` - File patterns to skip
- `analysis.graphql.tagNames` - GraphQL template tag names
- `analysis.nestjs.decorators` - NestJS decorator patterns

## File Naming Conventions

- Use kebab-case for file and directory names
- TypeScript files use `.ts` or `.tsx` extensions
- Components in PascalCase (e.g., `DependencyGraph.tsx`)
- Utilities and services in kebab-case (e.g., `file-scanner.ts`)
- Test files end with `.test.ts` or `.spec.ts`

## Common Tasks

### Adding New Analyzer
1. Create analyzer class in `packages/analyzer/src/analyzers/`
2. Implement analysis method returning structured data
3. Add to `AnalysisEngine` orchestration
4. Export from `packages/analyzer/src/analyzers/index.ts`

### Adding CLI Command
1. Create command file in `packages/cli/src/commands/`
2. Import and register in `packages/cli/src/cli.ts`
3. Use consistent option patterns (--filter, --verbose, etc.)

### Extending Configuration
1. Update types in `packages/cli/src/config/types.ts`
2. Update default config and validation
3. Update analysis engine to use new config options

## Testing Strategy

- Unit tests for individual analyzers
- Integration tests for full analysis pipeline
- CLI command tests with fixture data
- UI component tests with React Testing Library