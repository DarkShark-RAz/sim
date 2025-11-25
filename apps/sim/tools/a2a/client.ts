import type { A2AClientParams, A2AClientResponse } from '@/tools/a2a/types'
import type { ToolConfig } from '@/tools/types'

/**
 * A2A Client Tool
 *
 * Connects to remote A2A (Agent-to-Agent) protocol servers and sends messages.
 * This enables integration with Google ADK agents and other A2A-compliant agents.
 *
 * The A2A protocol is an open standard for agent interoperability.
 * See: https://google-a2a.github.io/A2A
 */
export const a2aClientTool: ToolConfig<A2AClientParams, A2AClientResponse> = {
  id: 'a2a_client',
  name: 'A2A Client',
  description:
    'Connect to remote A2A (Agent-to-Agent) protocol servers to communicate with AI agents. Supports Google ADK agents and other A2A-compliant agents.',
  version: '1.0.0',

  params: {
    serverUrl: {
      type: 'string',
      required: true,
      description: 'The base URL of the A2A server (e.g., http://localhost:8001)',
    },
    prompt: {
      type: 'string',
      required: true,
      description: 'The message to send to the remote agent',
    },
    timeout: {
      type: 'number',
      default: 30000,
      description: 'Request timeout in milliseconds',
    },
    headers: {
      type: 'object',
      description: 'Custom HTTP headers to include in the A2A request',
    },
  },

  request: {
    // The URL is constructed dynamically to call our internal A2A proxy endpoint
    url: '/api/a2a/send',
    method: 'POST',
    headers: () => ({
      'Content-Type': 'application/json',
    }),
    body: (params: A2AClientParams) => ({
      serverUrl: params.serverUrl,
      prompt: params.prompt,
      timeout: params.timeout || 30000,
      headers: params.headers,
    }),
  },

  transformResponse: async (response: Response): Promise<A2AClientResponse> => {
    if (!response.ok) {
      let errorMessage = `A2A request failed: ${response.status} ${response.statusText}`
      try {
        const errorData = await response.json()
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        // Failed to parse error response
      }

      return {
        success: false,
        output: {
          response: '',
        },
        error: errorMessage,
      }
    }

    const data = await response.json()

    return {
      success: true,
      output: {
        response: data.response || data.textOutput || '',
        agentName: data.agentName,
        taskId: data.taskId,
        status: data.status,
      },
    }
  },

  outputs: {
    response: {
      type: 'string',
      description: 'The text response from the remote A2A agent',
    },
    agentName: {
      type: 'string',
      description: 'The name of the remote agent that responded',
      optional: true,
    },
    taskId: {
      type: 'string',
      description: 'The task ID assigned by the A2A server',
      optional: true,
    },
    status: {
      type: 'string',
      description: 'The status of the A2A task (e.g., completed, in_progress)',
      optional: true,
    },
  },
}
