# Exa MCP Server Update Specification

**Version**: 2.0.0
**MCP Protocol Version**: 2025-11-25 (v1.25.x)
**Date**: February 2026

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [SDK Migration: Axios to exa-js](#3-sdk-migration-axios-to-exa-js)
4. [Toolhost Pattern Implementation](#4-toolhost-pattern-implementation)
5. [MCP 2025-11-25 Protocol Implementation](#5-mcp-2025-11-25-protocol-implementation)
6. [Graceful Fallback Strategy](#6-graceful-fallback-strategy)
7. [Data Design](#7-data-design)
8. [API Surface](#8-api-surface)
9. [Configuration & Capabilities](#9-configuration--capabilities)
10. [Error Handling](#10-error-handling)
11. [Security Considerations](#11-security-considerations)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Executive Summary

This specification describes a comprehensive update to the Exa MCP Server that:

- **Migrates** from direct Axios HTTP calls to the official `exa-js` SDK
- **Implements** the MCP 2025-11-25 specification (v1.25.x) with full support for Tasks, Sampling with Tools, Progress, Ping, Roots, and Elicitation
- **Adopts** the Toolhost Pattern, consolidating all operations behind four meta-tools: `websets-sync`, `websets-async`, `exa-sync`, and `exa-async`
- **Provides** graceful fallbacks to synchronous implementations when clients lack support for advanced MCP features
- **Removes** Smithery dependency in favor of native MCP SDK transports
- **Includes** a `data-design/` folder containing the authoritative OpenAPI specifications for both APIs

### Key Principles

1. **Client Compatibility**: Only assume client support for Tools; all other features degrade gracefully
2. **Operational Transparency**: Async operations provide start/stop/check capabilities even without Tasks support
3. **SDK-First**: Leverage `exa-js` SDK for type safety, automatic retries, and streaming support
4. **Protocol Compliance**: Full adherence to MCP 2025-11-25 specification

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MCP Client                                      │
│                    (Claude Desktop, IDE Plugin, etc.)                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ MCP Protocol (JSON-RPC 2.0)
                                      │ Transport: stdio / Streamable HTTP
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Exa MCP Server v2.0                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Protocol Layer                                    │  │
│  │  • Lifecycle Management (initialize/shutdown)                         │  │
│  │  • Capability Negotiation                                             │  │
│  │  • Progress Tracking                                                  │  │
│  │  • Task Management (experimental)                                     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Toolhost Layer                                    │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │ websets-sync│ │websets-async│ │  exa-sync   │ │  exa-async  │     │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                      Registry Layer                                    │  │
│  │  • Operation Registry (Websets: 20+ ops, Search: 10+ ops)            │  │
│  │  • Schema Validation (Zod)                                           │  │
│  │  • Request/Response Transformation                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                       SDK Layer                                        │  │
│  │  • exa-js SDK (Search, Contents, Similar, Answer, Research)          │  │
│  │  • Websets API Client (built on exa-js patterns)                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTPS
                                      ▼
                        ┌─────────────────────────┐
                        │      Exa API            │
                        │  api.exa.ai             │
                        │  • /search              │
                        │  • /findSimilar         │
                        │  • /contents            │
                        │  • /answer              │
                        │  • /research/v1         │
                        │  • /v0/websets/*        │
                        └─────────────────────────┘
```

### 2.2 Directory Structure

```
exa-mcp-server/
├── data-design/
│   ├── exa-search-spec.yaml      # Exa Search API OpenAPI 3.1.0
│   └── exa-websets-spec.yaml     # Exa Websets API OpenAPI 3.1.0
├── src/
│   ├── index.ts                   # Server entry point
│   ├── server.ts                  # MCP Server configuration
│   ├── types/
│   │   ├── index.ts               # Re-exports
│   │   ├── mcp.ts                 # MCP protocol types
│   │   ├── websets.ts             # Websets domain types
│   │   └── search.ts              # Search domain types
│   ├── protocol/
│   │   ├── lifecycle.ts           # Initialize/shutdown handlers
│   │   ├── capabilities.ts        # Capability detection & negotiation
│   │   ├── tasks.ts               # Task state machine
│   │   ├── progress.ts            # Progress notification handler
│   │   └── ping.ts                # Ping handler
│   ├── toolhost/
│   │   ├── index.ts               # Toolhost coordinator
│   │   ├── registry.ts            # Operation registry
│   │   ├── websets-sync.ts        # Synchronous Websets operations
│   │   ├── websets-async.ts       # Asynchronous Websets operations
│   │   ├── exa-sync.ts            # Synchronous Search operations
│   │   └── exa-async.ts           # Asynchronous Search operations
│   ├── operations/
│   │   ├── websets/               # Individual Websets operations
│   │   │   ├── create.ts
│   │   │   ├── list.ts
│   │   │   ├── get.ts
│   │   │   ├── update.ts
│   │   │   ├── delete.ts
│   │   │   ├── items/
│   │   │   ├── searches/
│   │   │   ├── enrichments/
│   │   │   └── monitors/
│   │   └── search/                # Individual Search operations
│   │       ├── search.ts
│   │       ├── find-similar.ts
│   │       ├── contents.ts
│   │       ├── answer.ts
│   │       └── research.ts
│   ├── sdk/
│   │   ├── exa-client.ts          # exa-js SDK wrapper
│   │   └── websets-client.ts      # Websets client (exa-js patterns)
│   └── utils/
│       ├── logger.ts              # Structured logging
│       ├── errors.ts              # Error types and handling
│       └── validation.ts          # Schema validation utilities
├── package.json
├── tsconfig.json
├── UPDATE_SPEC.md                 # This specification
└── README.md
```

---

## 3. SDK Migration: Axios to exa-js

### 3.1 Current State (Axios)

The current implementation uses Axios directly for all API calls:

```typescript
// Current: Direct Axios usage
import axios from 'axios';

const client = axios.create({
  baseURL: 'https://api.exa.ai',
  headers: { 'x-api-key': apiKey }
});

const response = await client.post('/websets/v0/websets', params);
```

### 3.2 Target State (exa-js SDK)

The updated implementation uses the official `exa-js` SDK:

```typescript
// Target: exa-js SDK
import Exa from 'exa-js';

const exa = new Exa(apiKey);

// Search operations use SDK methods directly
const results = await exa.search(query, options);
const similar = await exa.findSimilar(url, options);
const contents = await exa.getContents(urls, options);
const answer = await exa.answer(question);

// Streaming support
for await (const chunk of exa.streamAnswer(question)) {
  // Process streaming response
}

// Research tasks
const { researchId } = await exa.research.create({ instructions, outputSchema });
const result = await exa.research.pollUntilFinished(researchId);
```

### 3.3 Websets Client Extension

Since the `exa-js` SDK focuses on Search operations, we'll create a Websets client following the same patterns:

```typescript
// src/sdk/websets-client.ts
import Exa from 'exa-js';

export class WebsetsClient {
  private baseUrl = 'https://api.exa.ai/websets/v0';

  constructor(private apiKey: string) {}

  // Webset CRUD
  async createWebset(params: CreateWebsetParams): Promise<Webset> { ... }
  async getWebset(id: string): Promise<Webset> { ... }
  async listWebsets(params?: ListParams): Promise<ListResponse<Webset>> { ... }
  async updateWebset(id: string, params: UpdateWebsetParams): Promise<Webset> { ... }
  async deleteWebset(id: string): Promise<void> { ... }

  // Items
  async listItems(websetId: string, params?: ListParams): Promise<ListResponse<Item>> { ... }
  async getItem(websetId: string, itemId: string): Promise<Item> { ... }

  // Searches
  async createSearch(websetId: string, params: CreateSearchParams): Promise<Search> { ... }
  async getSearch(websetId: string, searchId: string): Promise<Search> { ... }
  async cancelSearch(websetId: string, searchId: string): Promise<Search> { ... }

  // Enrichments
  async createEnrichment(websetId: string, params: CreateEnrichmentParams): Promise<Enrichment> { ... }
  async getEnrichment(websetId: string, enrichmentId: string): Promise<Enrichment> { ... }
  async cancelEnrichment(websetId: string, enrichmentId: string): Promise<Enrichment> { ... }

  // Monitors
  async createMonitor(params: CreateMonitorParams): Promise<Monitor> { ... }
  async listMonitors(params?: ListParams): Promise<ListResponse<Monitor>> { ... }
  async getMonitor(id: string): Promise<Monitor> { ... }
  async deleteMonitor(id: string): Promise<void> { ... }

  // Webhooks
  async createWebhook(params: CreateWebhookParams): Promise<Webhook> { ... }
  async listWebhooks(params?: ListParams): Promise<ListResponse<Webhook>> { ... }
  async getWebhook(id: string): Promise<Webhook> { ... }
  async deleteWebhook(id: string): Promise<void> { ... }

  // Events
  async listEvents(params?: ListEventsParams): Promise<ListResponse<Event>> { ... }
}
```

### 3.4 Unified Client Factory

```typescript
// src/sdk/exa-client.ts
import Exa from 'exa-js';
import { WebsetsClient } from './websets-client';

export interface ExaClients {
  search: Exa;
  websets: WebsetsClient;
}

export function createExaClients(apiKey: string): ExaClients {
  return {
    search: new Exa(apiKey),
    websets: new WebsetsClient(apiKey)
  };
}
```

---

## 4. Toolhost Pattern Implementation

### 4.1 Concept

The Toolhost Pattern consolidates multiple granular tools into a small number of "meta-tools" that act as registries. Each meta-tool exposes operations that can be discovered and invoked dynamically.

**Benefits:**
- Reduces tool count visible to the model (4 vs 25+)
- Provides consistent interface patterns
- Enables operation discovery and documentation
- Separates sync/async concerns clearly

### 4.2 Meta-Tool Definitions

#### 4.2.1 websets-sync

Synchronous operations for Websets API that return immediately.

```typescript
{
  name: "websets-sync",
  title: "Exa Websets (Synchronous)",
  description: "Execute synchronous operations on Exa Websets. Use for CRUD operations that return immediately.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: [
          "list_operations",     // Meta: list available operations
          "create_webset",
          "get_webset",
          "list_websets",
          "update_webset",
          "delete_webset",
          "get_item",
          "list_items",
          "delete_item",
          "get_search",
          "get_enrichment",
          "get_monitor",
          "list_monitors",
          "delete_monitor",
          "get_webhook",
          "list_webhooks",
          "delete_webhook",
          "list_events"
        ],
        description: "The operation to execute. Use 'list_operations' to see all available operations with their schemas."
      },
      params: {
        type: "object",
        description: "Operation-specific parameters. Use 'list_operations' to see required parameters for each operation."
      }
    },
    required: ["operation"]
  }
}
```

#### 4.2.2 websets-async

Asynchronous operations for Websets API that involve long-running processes.

```typescript
{
  name: "websets-async",
  title: "Exa Websets (Asynchronous)",
  description: "Execute asynchronous operations on Exa Websets. Use for long-running operations like searches and enrichments.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: [
          "list_operations",     // Meta: list available operations
          "start_search",        // Start a search operation
          "check_search",        // Check search status
          "cancel_search",       // Cancel a running search
          "start_enrichment",    // Start an enrichment operation
          "check_enrichment",    // Check enrichment status
          "cancel_enrichment",   // Cancel a running enrichment
          "start_monitor",       // Start a monitoring job
          "check_monitor_runs",  // Check monitor run history
          "stop_monitor"         // Stop/delete a monitor
        ],
        description: "The async operation to execute."
      },
      params: {
        type: "object",
        description: "Operation-specific parameters."
      }
    },
    required: ["operation"]
  },
  execution: {
    taskSupport: "optional"  // Can be invoked as MCP Task when supported
  }
}
```

#### 4.2.3 exa-sync

Synchronous operations for Exa Search API.

```typescript
{
  name: "exa-sync",
  title: "Exa Search (Synchronous)",
  description: "Execute synchronous search operations. Use for quick searches and content retrieval.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: [
          "list_operations",     // Meta: list available operations
          "search",              // Neural/keyword search
          "find_similar",        // Find similar pages
          "get_contents",        // Get page contents
          "answer"               // Get answer with citations
        ],
        description: "The search operation to execute."
      },
      params: {
        type: "object",
        description: "Operation-specific parameters."
      }
    },
    required: ["operation"]
  }
}
```

#### 4.2.4 exa-async

Asynchronous operations for Exa Search API (Research tasks).

```typescript
{
  name: "exa-async",
  title: "Exa Search (Asynchronous)",
  description: "Execute asynchronous research operations. Use for deep research tasks that take longer to complete.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: [
          "list_operations",     // Meta: list available operations
          "start_research",      // Start a research task
          "check_research",      // Check research status
          "cancel_research",     // Cancel research (if supported)
          "stream_answer"        // Stream an answer response
        ],
        description: "The async operation to execute."
      },
      params: {
        type: "object",
        description: "Operation-specific parameters."
      }
    },
    required: ["operation"]
  },
  execution: {
    taskSupport: "optional"
  }
}
```

### 4.3 Operation Registry

```typescript
// src/toolhost/registry.ts

export interface OperationDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  isAsync: boolean;
  execute: (params: unknown, context: ExecutionContext) => Promise<unknown>;
}

export interface OperationRegistry {
  register(operation: OperationDefinition): void;
  get(name: string): OperationDefinition | undefined;
  list(): OperationDefinition[];
  execute(name: string, params: unknown, context: ExecutionContext): Promise<unknown>;
}

// Registry instances
export const websetsRegistry = createRegistry('websets');
export const searchRegistry = createRegistry('search');
```

### 4.4 Operation Discovery (list_operations)

Every meta-tool supports a `list_operations` operation that returns available operations with their schemas:

```typescript
// Example response for websets-sync list_operations
{
  "operations": [
    {
      "name": "create_webset",
      "description": "Create a new Webset with optional search and enrichments",
      "inputSchema": {
        "type": "object",
        "properties": {
          "search": {
            "type": "object",
            "properties": {
              "query": { "type": "string" },
              "count": { "type": "integer", "minimum": 1, "maximum": 10000 }
            }
          },
          "enrichments": {
            "type": "array",
            "items": { "$ref": "#/definitions/EnrichmentConfig" }
          },
          "externalId": { "type": "string" },
          "metadata": { "type": "object" }
        }
      },
      "outputSchema": { "$ref": "#/definitions/Webset" }
    },
    // ... more operations
  ]
}
```

---

## 5. MCP 2025-11-25 Protocol Implementation

### 5.1 Capability Declaration

The server declares comprehensive capabilities during initialization:

```typescript
// Server capabilities
{
  "capabilities": {
    "tools": {
      "listChanged": true
    },
    "logging": {},
    "tasks": {
      "list": {},
      "cancel": {},
      "requests": {
        "tools": {
          "call": {}
        }
      }
    }
  },
  "serverInfo": {
    "name": "exa-mcp-server",
    "title": "Exa Search & Websets",
    "version": "2.0.0",
    "description": "MCP server for Exa Search API and Websets API"
  },
  "instructions": "Use websets-sync/websets-async for Websets operations and exa-sync/exa-async for Search operations. Call any tool with operation='list_operations' to discover available operations."
}
```

### 5.2 Tasks Implementation

Tasks enable asynchronous, long-running operations with proper state management.

#### 5.2.1 Task State Machine

```typescript
// src/protocol/tasks.ts

export type TaskStatus =
  | 'working'
  | 'input_required'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface Task {
  taskId: string;
  status: TaskStatus;
  statusMessage?: string;
  createdAt: string;      // ISO 8601
  lastUpdatedAt: string;  // ISO 8601
  ttl: number;            // milliseconds
  pollInterval?: number;  // milliseconds
}

export interface TaskStore {
  create(requestId: string, ttl?: number): Task;
  get(taskId: string): Task | undefined;
  list(cursor?: string): { tasks: Task[]; nextCursor?: string };
  updateStatus(taskId: string, status: TaskStatus, message?: string): Task;
  setResult(taskId: string, result: unknown): void;
  getResult(taskId: string): unknown;
  cancel(taskId: string): Task;
  cleanup(): void;  // Remove expired tasks
}
```

#### 5.2.2 Task-Augmented Tool Calls

```typescript
// Handling task-augmented tools/call request
async function handleToolCall(request: CallToolRequest): Promise<CallToolResult | CreateTaskResult> {
  const { name, arguments: args, task } = request.params;

  // If task augmentation requested and operation supports it
  if (task && isAsyncOperation(name, args.operation)) {
    const newTask = taskStore.create(request.id, task.ttl);

    // Start async execution
    executeAsync(name, args, newTask.taskId);

    return {
      task: {
        taskId: newTask.taskId,
        status: 'working',
        statusMessage: `Started ${args.operation}`,
        createdAt: newTask.createdAt,
        lastUpdatedAt: newTask.lastUpdatedAt,
        ttl: newTask.ttl,
        pollInterval: 5000
      }
    };
  }

  // Synchronous execution
  return await executeTool(name, args);
}
```

#### 5.2.3 Task Protocol Messages

```typescript
// tasks/get - Get task status
interface TasksGetRequest {
  method: 'tasks/get';
  params: { taskId: string };
}

// tasks/result - Get task result (blocks until terminal)
interface TasksResultRequest {
  method: 'tasks/result';
  params: { taskId: string };
}

// tasks/list - List all tasks
interface TasksListRequest {
  method: 'tasks/list';
  params: { cursor?: string };
}

// tasks/cancel - Cancel a task
interface TasksCancelRequest {
  method: 'tasks/cancel';
  params: { taskId: string };
}

// notifications/tasks/status - Status change notification
interface TaskStatusNotification {
  method: 'notifications/tasks/status';
  params: Task;
}
```

### 5.3 Progress Tracking

```typescript
// src/protocol/progress.ts

export interface ProgressNotification {
  progressToken: string | number;
  progress: number;
  total?: number;
  message?: string;
}

export class ProgressReporter {
  constructor(
    private token: string | number,
    private sendNotification: (notification: ProgressNotification) => void
  ) {}

  report(progress: number, total?: number, message?: string): void {
    this.sendNotification({
      progressToken: this.token,
      progress,
      total,
      message
    });
  }

  // Helper for percentage-based progress
  reportPercent(percent: number, message?: string): void {
    this.report(percent, 100, message);
  }
}

// Usage in async operations
async function executeSearch(params: SearchParams, progress: ProgressReporter): Promise<SearchResult> {
  progress.report(0, 100, 'Initializing search...');

  const search = await client.createSearch(params);
  progress.report(10, 100, 'Search created, waiting for results...');

  while (search.status === 'running') {
    await delay(1000);
    const status = await client.getSearch(search.id);
    progress.report(10 + (status.progress * 0.9), 100, `Processing: ${status.itemsFound} items found`);
  }

  progress.report(100, 100, 'Search completed');
  return search;
}
```

### 5.4 Sampling with Tools

The server can request LLM sampling from the client for complex operations:

```typescript
// src/protocol/sampling.ts

export interface SamplingRequest {
  messages: SamplingMessage[];
  modelPreferences?: ModelPreferences;
  systemPrompt?: string;
  maxTokens: number;
  tools?: ToolDefinition[];
  toolChoice?: ToolChoice;
}

// Example: Using sampling for intelligent enrichment suggestions
async function suggestEnrichments(
  websetDescription: string,
  clientCapabilities: ClientCapabilities
): Promise<EnrichmentSuggestion[]> {

  if (!clientCapabilities.sampling?.tools) {
    // Fallback: return predefined suggestions
    return getDefaultEnrichmentSuggestions(websetDescription);
  }

  const response = await client.requestSampling({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Based on this Webset description, suggest appropriate enrichments: "${websetDescription}"`
      }
    }],
    tools: [{
      name: 'suggest_enrichment',
      description: 'Suggest an enrichment configuration',
      inputSchema: enrichmentSuggestionSchema
    }],
    toolChoice: { mode: 'required' },
    maxTokens: 1000
  });

  return parseEnrichmentSuggestions(response);
}
```

### 5.5 Elicitation

Support for requesting user input during operations:

```typescript
// src/protocol/elicitation.ts

// Form mode: Request structured input
async function requestApiKeyViaForm(client: McpClient): Promise<string | null> {
  if (!client.capabilities.elicitation?.form) {
    return null;
  }

  const response = await client.elicit({
    mode: 'form',
    message: 'Please provide your Exa API key to continue',
    requestedSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          title: 'Exa API Key',
          description: 'Your Exa API key from dashboard.exa.ai'
        }
      },
      required: ['apiKey']
    }
  });

  if (response.action === 'accept') {
    return response.content.apiKey;
  }
  return null;
}

// URL mode: Redirect for OAuth or sensitive operations
async function requestOAuthAuthorization(
  client: McpClient,
  service: string
): Promise<boolean> {
  if (!client.capabilities.elicitation?.url) {
    return false;
  }

  const elicitationId = generateUUID();
  const response = await client.elicit({
    mode: 'url',
    elicitationId,
    url: `https://api.exa.ai/oauth/authorize?service=${service}&elicitation=${elicitationId}`,
    message: `Please authorize access to ${service} to continue`
  });

  return response.action === 'accept';
}
```

### 5.6 Roots

Support for filesystem boundaries:

```typescript
// src/protocol/roots.ts

export interface Root {
  uri: string;   // file:// URI
  name?: string; // Human-readable name
}

// Used when operations need to access local files
async function handleFileBasedImport(
  client: McpClient,
  filePath: string
): Promise<void> {
  if (!client.capabilities.roots) {
    throw new Error('File operations require roots capability');
  }

  const roots = await client.listRoots();
  const isAllowed = roots.some(root =>
    filePath.startsWith(root.uri.replace('file://', ''))
  );

  if (!isAllowed) {
    throw new Error(`File path ${filePath} is not within allowed roots`);
  }

  // Proceed with file operation
}
```

### 5.7 Ping

```typescript
// src/protocol/ping.ts

export function handlePing(): EmptyResult {
  return {};
}

// Server can also ping clients to check connectivity
async function checkClientConnectivity(client: McpClient): Promise<boolean> {
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
```

---

## 6. Graceful Fallback Strategy

### 6.1 Principle

**Only assume client support for Tools.** All other MCP features must degrade gracefully to synchronous alternatives.

### 6.2 Feature Detection

```typescript
// src/protocol/capabilities.ts

export interface DetectedCapabilities {
  // Always supported
  tools: true;

  // Conditionally supported
  tasks: boolean;
  sampling: boolean;
  samplingWithTools: boolean;
  elicitation: boolean;
  elicitationForm: boolean;
  elicitationUrl: boolean;
  roots: boolean;
  progress: boolean;  // Inferred from progressToken in requests
}

export function detectCapabilities(
  clientCapabilities: ClientCapabilities
): DetectedCapabilities {
  return {
    tools: true,
    tasks: !!clientCapabilities.tasks?.requests?.sampling?.createMessage
        || !!clientCapabilities.tasks?.requests?.elicitation?.create,
    sampling: !!clientCapabilities.sampling,
    samplingWithTools: !!clientCapabilities.sampling?.tools,
    elicitation: !!clientCapabilities.elicitation,
    elicitationForm: !!clientCapabilities.elicitation?.form
        || (!!clientCapabilities.elicitation && !clientCapabilities.elicitation.url),
    elicitationUrl: !!clientCapabilities.elicitation?.url,
    roots: !!clientCapabilities.roots,
    progress: false  // Detected per-request via progressToken
  };
}
```

### 6.3 Async Operation Fallbacks

When clients don't support Tasks, async operations use a synchronous polling pattern:

```typescript
// src/toolhost/fallbacks.ts

/**
 * For clients without Tasks support, async operations are exposed as three sync operations:
 * - start_<operation>: Initiates the operation, returns an operation ID
 * - check_<operation>: Checks operation status and returns current state
 * - cancel_<operation>: Cancels the operation
 */

// Without Tasks support
async function handleAsyncOperation(
  operation: string,
  params: unknown,
  capabilities: DetectedCapabilities
): Promise<ToolResult> {

  switch (operation) {
    case 'start_search':
      const search = await client.createSearch(params);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            operationId: search.id,
            status: search.status,
            message: 'Search started. Use check_search to monitor progress.',
            checkWith: {
              operation: 'check_search',
              params: { websetId: params.websetId, searchId: search.id }
            },
            cancelWith: {
              operation: 'cancel_search',
              params: { websetId: params.websetId, searchId: search.id }
            }
          }, null, 2)
        }]
      };

    case 'check_search':
      const status = await client.getSearch(params.websetId, params.searchId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            operationId: status.id,
            status: status.status,
            progress: status.progress,
            itemsFound: status.itemsFound,
            isComplete: status.status === 'completed' || status.status === 'failed'
          }, null, 2)
        }]
      };

    case 'cancel_search':
      const cancelled = await client.cancelSearch(params.websetId, params.searchId);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            operationId: cancelled.id,
            status: 'cancelled',
            message: 'Search cancelled successfully'
          }, null, 2)
        }]
      };
  }
}
```

### 6.4 Sampling Fallbacks

```typescript
// When sampling is not available
async function handleOperationRequiringSampling(
  params: unknown,
  capabilities: DetectedCapabilities
): Promise<ToolResult> {

  if (capabilities.samplingWithTools) {
    // Use sampling for intelligent processing
    return await handleWithSampling(params);
  }

  if (capabilities.sampling) {
    // Use basic sampling without tools
    return await handleWithBasicSampling(params);
  }

  // Fallback: Return data for the model to process directly
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        data: await fetchRawData(params),
        instruction: 'Process this data according to the user request. The server could not perform intelligent processing due to client limitations.'
      }, null, 2)
    }]
  };
}
```

### 6.5 Elicitation Fallbacks

```typescript
// When elicitation is not available
async function handleOperationRequiringInput(
  requiredField: string,
  capabilities: DetectedCapabilities
): Promise<ToolResult> {

  if (capabilities.elicitationForm) {
    // Request via form
    const response = await requestViaForm(requiredField);
    if (response) return await continueOperation(response);
  }

  // Fallback: Return error with instructions
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        error: 'input_required',
        message: `This operation requires ${requiredField}`,
        instruction: `Please provide ${requiredField} as a parameter and retry the operation`,
        retryWith: {
          operation: 'current_operation',
          params: { [requiredField]: '<your_value_here>' }
        }
      }, null, 2)
    }],
    isError: true
  };
}
```

### 6.6 Progress Fallbacks

```typescript
// When progress tracking is not available
async function executeWithOptionalProgress(
  operation: () => AsyncGenerator<ProgressUpdate, Result>,
  progressToken?: string | number
): Promise<Result> {

  const hasProgress = progressToken !== undefined;

  for await (const update of operation()) {
    if (update.type === 'progress' && hasProgress) {
      sendProgressNotification({
        progressToken,
        progress: update.current,
        total: update.total,
        message: update.message
      });
    } else if (update.type === 'result') {
      return update.value;
    }
  }
}
```

---

## 7. Data Design

### 7.1 OpenAPI Specifications

The `data-design/` folder contains authoritative OpenAPI 3.1.0 specifications:

#### 7.1.1 exa-search-spec.yaml

```yaml
# Location: data-design/exa-search-spec.yaml
# Source: https://github.com/exa-labs/openapi-spec/blob/master/exa-openapi-spec.yaml

Endpoints:
  POST /search          # Neural/keyword search
  POST /findSimilar     # Find similar pages
  POST /contents        # Get page contents
  POST /answer          # Answer with citations
  GET  /research/v1     # Research task status
  POST /research/v1     # Create research task
```

#### 7.1.2 exa-websets-spec.yaml

```yaml
# Location: data-design/exa-websets-spec.yaml
# Source: https://github.com/exa-labs/openapi-spec/blob/master/exa-websets-spec.yaml

Endpoints:
  # Websets
  POST   /v0/websets              # Create webset
  GET    /v0/websets              # List websets
  GET    /v0/websets/{id}         # Get webset
  POST   /v0/websets/{id}         # Update webset
  DELETE /v0/websets/{id}         # Delete webset
  POST   /v0/websets/{id}/cancel  # Cancel webset operations

  # Items
  GET    /v0/websets/{webset}/items        # List items
  GET    /v0/websets/{webset}/items/{id}   # Get item
  DELETE /v0/websets/{webset}/items/{id}   # Delete item

  # Searches
  POST   /v0/websets/{webset}/searches           # Create search
  GET    /v0/websets/{webset}/searches           # List searches
  GET    /v0/websets/{webset}/searches/{id}      # Get search
  PATCH  /v0/websets/{webset}/searches/{id}      # Update search
  POST   /v0/websets/{webset}/searches/{id}/cancel  # Cancel search

  # Enrichments
  POST   /v0/websets/{webset}/enrichments           # Create enrichment
  GET    /v0/websets/{webset}/enrichments           # List enrichments
  GET    /v0/websets/{webset}/enrichments/{id}      # Get enrichment
  PATCH  /v0/websets/{webset}/enrichments/{id}      # Update enrichment
  DELETE /v0/websets/{webset}/enrichments/{id}      # Delete enrichment
  POST   /v0/websets/{webset}/enrichments/{id}/cancel  # Cancel enrichment

  # Monitors
  POST   /v0/monitors        # Create monitor
  GET    /v0/monitors        # List monitors
  GET    /v0/monitors/{id}   # Get monitor
  DELETE /v0/monitors/{id}   # Delete monitor

  # Webhooks
  POST   /v0/webhooks                    # Create webhook
  GET    /v0/webhooks                    # List webhooks
  GET    /v0/webhooks/{id}               # Get webhook
  DELETE /v0/webhooks/{id}               # Delete webhook
  GET    /v0/webhooks/{id}/attempts      # List webhook attempts

  # Events
  GET    /v0/events          # List events

  # Imports
  POST   /v0/imports         # Create import
  GET    /v0/imports/{id}    # Get import
```

### 7.2 Type Generation

Types are derived from OpenAPI specs using code generation:

```bash
# Generate types from OpenAPI specs
npx openapi-typescript data-design/exa-search-spec.yaml -o src/types/generated/search.ts
npx openapi-typescript data-design/exa-websets-spec.yaml -o src/types/generated/websets.ts
```

---

## 8. API Surface

### 8.1 Complete Operation Registry

#### 8.1.1 websets-sync Operations

| Operation | Description | Parameters |
|-----------|-------------|------------|
| `list_operations` | List all available operations | - |
| `create_webset` | Create a new Webset | search?, enrichments?, externalId?, metadata? |
| `get_webset` | Get Webset details | id |
| `list_websets` | List all Websets | cursor?, limit? |
| `update_webset` | Update Webset metadata | id, metadata |
| `delete_webset` | Delete a Webset | id |
| `get_item` | Get item details | websetId, itemId |
| `list_items` | List items in Webset | websetId, cursor?, limit? |
| `delete_item` | Delete an item | websetId, itemId |
| `get_search` | Get search status | websetId, searchId |
| `get_enrichment` | Get enrichment status | websetId, enrichmentId |
| `get_monitor` | Get monitor details | monitorId |
| `list_monitors` | List all monitors | cursor?, limit? |
| `delete_monitor` | Delete a monitor | monitorId |
| `get_webhook` | Get webhook details | webhookId |
| `list_webhooks` | List all webhooks | cursor?, limit? |
| `delete_webhook` | Delete a webhook | webhookId |
| `list_events` | List events | type?, after?, before?, cursor?, limit? |

#### 8.1.2 websets-async Operations

| Operation | Description | Parameters |
|-----------|-------------|------------|
| `list_operations` | List all available operations | - |
| `start_search` | Start a search operation | websetId, query, count?, entity?, criteria? |
| `check_search` | Check search progress | websetId, searchId |
| `cancel_search` | Cancel a running search | websetId, searchId |
| `start_enrichment` | Start an enrichment | websetId, description, format, options? |
| `check_enrichment` | Check enrichment progress | websetId, enrichmentId |
| `cancel_enrichment` | Cancel enrichment | websetId, enrichmentId |
| `start_monitor` | Create a monitoring job | websetId, cadence, searchParams |
| `check_monitor_runs` | Get monitor run history | monitorId |
| `stop_monitor` | Stop/delete a monitor | monitorId |

#### 8.1.3 exa-sync Operations

| Operation | Description | Parameters |
|-----------|-------------|------------|
| `list_operations` | List all available operations | - |
| `search` | Search the web | query, numResults?, type?, contents?, filters? |
| `find_similar` | Find similar pages | url, numResults?, contents?, filters? |
| `get_contents` | Get page contents | urls, text?, highlights?, summary? |
| `answer` | Get answer with citations | question |

#### 8.1.4 exa-async Operations

| Operation | Description | Parameters |
|-----------|-------------|------------|
| `list_operations` | List all available operations | - |
| `start_research` | Start a research task | instructions, outputSchema?, model? |
| `check_research` | Check research status | researchId |
| `cancel_research` | Cancel research | researchId |
| `stream_answer` | Stream an answer | question |

### 8.2 Tool Annotations

Tools include annotations for client UI hints:

```typescript
{
  name: "websets-async",
  annotations: {
    // Indicates this tool may take a long time
    "io.modelcontextprotocol/long-running": true,
    // Hint about typical operation duration
    "io.modelcontextprotocol/typical-duration": "30s-5m",
    // Indicates tool supports background execution
    "io.modelcontextprotocol/background-capable": true
  }
}
```

---

## 9. Configuration & Capabilities

### 9.1 Server Configuration

```typescript
// Configuration schema
export interface ServerConfig {
  // Required
  exaApiKey: string;

  // Optional
  debug?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';

  // Tool configuration
  enabledTools?: ('websets-sync' | 'websets-async' | 'exa-sync' | 'exa-async')[];

  // Task configuration
  tasks?: {
    defaultTtl?: number;      // Default: 3600000 (1 hour)
    maxTtl?: number;          // Default: 86400000 (24 hours)
    cleanupInterval?: number; // Default: 60000 (1 minute)
  };

  // Rate limiting
  rateLimits?: {
    requestsPerMinute?: number;
    concurrentTasks?: number;
  };
}
```

### 9.2 Environment Variables

```bash
# Required
EXA_API_KEY=your-api-key

# Optional
EXA_MCP_DEBUG=true
EXA_MCP_LOG_LEVEL=debug
EXA_MCP_ENABLED_TOOLS=websets-sync,websets-async,exa-sync,exa-async
EXA_MCP_DEFAULT_TASK_TTL=3600000
EXA_MCP_MAX_TASK_TTL=86400000
```

### 9.3 Full Capability Declaration

```typescript
// Complete server capabilities for MCP 2025-11-25
const serverCapabilities: ServerCapabilities = {
  // Tool support
  tools: {
    listChanged: true
  },

  // Logging support
  logging: {},

  // Task support (experimental)
  tasks: {
    list: {},
    cancel: {},
    requests: {
      tools: {
        call: {}
      }
    }
  },

  // Note: Server does not declare prompts or resources
  // as all functionality is exposed via tools
};
```

---

## 10. Error Handling

### 10.1 Error Types

```typescript
// src/utils/errors.ts

export enum ErrorCode {
  // Standard JSON-RPC errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,

  // MCP-specific errors
  URL_ELICITATION_REQUIRED = -32042,

  // Custom application errors
  API_ERROR = -32000,
  RATE_LIMITED = -32001,
  AUTHENTICATION_ERROR = -32002,
  RESOURCE_NOT_FOUND = -32003,
  OPERATION_CANCELLED = -32004,
  TASK_EXPIRED = -32005
}

export class McpError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'McpError';
  }
}
```

### 10.2 Error Response Format

```typescript
// Tool execution errors (isError: true)
{
  "content": [{
    "type": "text",
    "text": "Search failed: Rate limit exceeded. Please wait 60 seconds before retrying."
  }],
  "isError": true
}

// Protocol errors (JSON-RPC error)
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Invalid params: 'query' is required for search operation",
    "data": {
      "operation": "search",
      "missingParams": ["query"]
    }
  }
}
```

### 10.3 Exa API Error Mapping

```typescript
// Map Exa API errors to MCP errors
function mapExaError(error: ExaApiError): McpError {
  switch (error.status) {
    case 400:
      return new McpError(
        ErrorCode.INVALID_PARAMS,
        error.message,
        { details: error.details, hint: formatParameterHint(error) }
      );
    case 401:
      return new McpError(
        ErrorCode.AUTHENTICATION_ERROR,
        'Invalid API key'
      );
    case 404:
      return new McpError(
        ErrorCode.RESOURCE_NOT_FOUND,
        error.message
      );
    case 429:
      return new McpError(
        ErrorCode.RATE_LIMITED,
        'Rate limit exceeded',
        { retryAfter: error.headers['retry-after'] }
      );
    default:
      return new McpError(
        ErrorCode.API_ERROR,
        error.message
      );
  }
}
```

---

## 11. Security Considerations

### 11.1 API Key Management

- API keys are stored only in memory, never logged
- Keys can be provided via environment variable or MCP configuration
- Elicitation can be used to request keys when not configured

### 11.2 Input Validation

- All inputs validated against Zod schemas before processing
- JSON Schema validation for tool parameters
- URL validation for any user-provided URLs

### 11.3 Task Security

- Task IDs are cryptographically random UUIDs
- Tasks are bound to the session that created them
- Task results are cleaned up after TTL expiration

### 11.4 Rate Limiting

- Built-in rate limiting for API requests
- Configurable limits per operation type
- Backoff and retry logic with exponential delays

---

## 12. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **SDK Migration**
   - [ ] Set up exa-js SDK integration
   - [ ] Create WebsetsClient class
   - [ ] Implement unified client factory
   - [ ] Add comprehensive type definitions

2. **Remove Smithery**
   - [ ] Replace Smithery build with native MCP SDK
   - [ ] Implement stdio transport handler
   - [ ] Implement Streamable HTTP transport handler
   - [ ] Update package.json scripts

### Phase 2: Toolhost Pattern (Week 2-3)

3. **Operation Registry**
   - [ ] Implement registry infrastructure
   - [ ] Migrate all Websets operations
   - [ ] Add Search operations
   - [ ] Implement `list_operations` meta-operation

4. **Meta-Tools**
   - [ ] Implement `websets-sync` tool
   - [ ] Implement `websets-async` tool
   - [ ] Implement `exa-sync` tool
   - [ ] Implement `exa-async` tool

### Phase 3: MCP 2025-11-25 (Week 3-4)

5. **Protocol Features**
   - [ ] Implement capability negotiation
   - [ ] Implement Tasks state machine
   - [ ] Implement Progress notifications
   - [ ] Implement Ping handler

6. **Client Features**
   - [ ] Implement Sampling support (with tools)
   - [ ] Implement Elicitation (form + URL)
   - [ ] Implement Roots support

### Phase 4: Fallbacks & Polish (Week 4-5)

7. **Graceful Fallbacks**
   - [ ] Implement sync fallbacks for async operations
   - [ ] Implement sampling fallbacks
   - [ ] Implement elicitation fallbacks
   - [ ] Add comprehensive error messages

8. **Testing & Documentation**
   - [ ] Unit tests for all operations
   - [ ] Integration tests with mock Exa API
   - [ ] Protocol compliance tests
   - [ ] Update README and documentation

### Phase 5: Release (Week 5)

9. **Release Preparation**
   - [ ] Performance optimization
   - [ ] Security audit
   - [ ] Version bump and changelog
   - [ ] npm publish

---

## Appendix A: References

### MCP Specification
- [MCP 2025-11-25 Specification](https://modelcontextprotocol.io/specification/2025-11-25)
- [Tasks Specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)
- [Sampling Specification](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling)
- [Elicitation Specification](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)

### Exa Documentation
- [exa-js SDK](https://github.com/exa-labs/exa-js)
- [Exa Search API](https://docs.exa.ai/reference/search)
- [Exa Websets API](https://docs.exa.ai/reference/websets)

### Blog Posts
- [One Year of MCP: November 2025 Spec Release](https://blog.modelcontextprotocol.io/posts/2025-11-25-first-mcp-anniversary/)
- [MCP 2025-11-25 Spec Update](https://workos.com/blog/mcp-2025-11-25-spec-update)

---

## Appendix B: Migration Guide

### From v1.x to v2.0

#### Tool Name Changes

| Old Tool | New Tool | Operation |
|----------|----------|-----------|
| `create_webset` | `websets-sync` | `create_webset` |
| `list_websets` | `websets-sync` | `list_websets` |
| `get_webset` | `websets-sync` | `get_webset` |
| `update_webset` | `websets-sync` | `update_webset` |
| `delete_webset` | `websets-sync` | `delete_webset` |
| `list_webset_items` | `websets-sync` | `list_items` |
| `get_item` | `websets-sync` | `get_item` |
| `create_search` | `websets-async` | `start_search` |
| `get_search` | `websets-async` | `check_search` |
| `cancel_search` | `websets-async` | `cancel_search` |
| `create_enrichment` | `websets-async` | `start_enrichment` |
| `get_enrichment` | `websets-async` | `check_enrichment` |
| `cancel_enrichment` | `websets-async` | `cancel_enrichment` |
| `create_monitor` | `websets-async` | `start_monitor` |

#### Configuration Changes

```json
// Old configuration
{
  "mcpServers": {
    "websets": {
      "command": "npx",
      "args": ["websets-mcp-server"],
      "env": {
        "EXA_API_KEY": "your-key"
      }
    }
  }
}

// New configuration
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["exa-mcp-server"],
      "env": {
        "EXA_API_KEY": "your-key"
      }
    }
  }
}
```

---

*This specification is a living document and will be updated as implementation progresses.*
