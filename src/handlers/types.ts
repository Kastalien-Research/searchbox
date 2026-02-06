import type { Exa } from 'exa-js';

export type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export type OperationHandler = (
  args: Record<string, unknown>,
  exa: Exa
) => Promise<ToolResult>;

export function successResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

export function errorResult(operation: string, error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text', text: `Error in ${operation}: ${message}` }],
    isError: true,
  };
}
