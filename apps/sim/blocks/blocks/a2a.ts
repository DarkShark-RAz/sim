import { AgentIcon } from '@/components/icons'
import type { BlockConfig } from '@/blocks/types'
import type { A2AClientResponse } from '@/tools/a2a/types'

export const A2ABlock: BlockConfig<A2AClientResponse> = {
  type: 'a2a',
  name: 'A2A Agent',
  description: 'Connect to remote A2A agents',
  longDescription:
    'Connect to remote AI agents using the Agent-to-Agent (A2A) protocol. This enables integration with Google ADK agents and other A2A-compliant agents for distributed AI workflows.',
  docsLink: 'https://google-a2a.github.io/A2A',
  bestPractices: `
  - Ensure the remote A2A server is running and accessible before using this block.
  - The server URL should point to the base URL of the A2A server (e.g., http://localhost:8001).
  - For Docker environments, use host.docker.internal to reach services on the host machine.
  - Test the agent card endpoint (/.well-known/agent-card.json) to verify connectivity.
  `,
  category: 'blocks',
  bgColor: '#7C3AED', // Purple color for AI/Agent blocks
  icon: AgentIcon,
  subBlocks: [
    {
      id: 'serverUrl',
      title: 'Server URL',
      type: 'short-input',
      placeholder: 'http://localhost:8001',
      required: true,
      description: 'Base URL of the A2A server',
    },
    {
      id: 'prompt',
      title: 'Message',
      type: 'long-input',
      placeholder: 'Enter your message to the remote agent...',
      required: true,
      rows: 4,
    },
    {
      id: 'timeout',
      title: 'Timeout (ms)',
      type: 'short-input',
      placeholder: '30000',
      defaultValue: '30000',
      description: 'Request timeout in milliseconds',
    },
    {
      id: 'headers',
      title: 'Custom Headers',
      type: 'table',
      columns: ['Key', 'Value'],
      placeholder: 'Add custom headers...',
      description: 'Custom HTTP headers to include in the A2A request (e.g., Authorization, X-Custom-Header)',
    },
  ],
  tools: {
    access: ['a2a_client'],
  },
  inputs: {
    serverUrl: { type: 'string', description: 'Base URL of the A2A server' },
    prompt: { type: 'string', description: 'Message to send to the remote agent' },
    timeout: { type: 'number', description: 'Request timeout in milliseconds' },
    headers: { type: 'json', description: 'Custom HTTP headers as key-value pairs' },
  },
  outputs: {
    response: { type: 'string', description: 'Text response from the remote A2A agent' },
    agentName: { type: 'string', description: 'Name of the remote agent that responded' },
    taskId: { type: 'string', description: 'Task ID assigned by the A2A server' },
    status: { type: 'string', description: 'Status of the A2A task' },
  },
}
