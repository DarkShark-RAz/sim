import type { TableRow, ToolResponse } from "@/tools/types";

export interface A2AClientParams {
  serverUrl: string;
  prompt: string;
  timeout?: number;
  headers?: TableRow[];
}

export interface A2AClientResponse extends ToolResponse {
  output: {
    response: string;
    agentName?: string;
    taskId?: string;
    status?: string;
  };
}
