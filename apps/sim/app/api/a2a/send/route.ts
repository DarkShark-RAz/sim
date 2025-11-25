import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/lib/logs/console/logger'
import { generateRequestId } from '@/lib/utils'
import { v4 as uuidv4 } from 'uuid'

const logger = createLogger('A2A-API')

const headerRowSchema = z.object({
  id: z.string(),
  cells: z.object({
    Key: z.string(),
    Value: z.string(),
  }),
})

const a2aRequestSchema = z.object({
  serverUrl: z.string().url('Invalid server URL'),
  prompt: z.string().min(1, 'Prompt is required'),
  timeout: z.coerce.number().optional().default(30000),
  headers: z.array(headerRowSchema).optional(),
})

/**
 * Transform table rows to a headers object
 */
function transformHeaders(headers?: z.infer<typeof headerRowSchema>[]): Record<string, string> {
  if (!headers || headers.length === 0) return {}
  
  return headers.reduce((acc, row) => {
    if (row.cells?.Key && row.cells?.Value) {
      acc[row.cells.Key] = row.cells.Value
    }
    return acc
  }, {} as Record<string, string>)
}

/**
 * A2A Protocol Message Types
 * Based on the A2A Protocol specification
 */
interface A2AMessage {
  kind: 'message'
  messageId: string
  role: 'user' | 'agent'
  parts: A2APart[]
  contextId?: string
}

interface A2APart {
  kind: 'text'
  text: string
}

interface A2AAgentCard {
  name: string
  description?: string
  url: string
  version?: string
  protocolVersion?: string
  skills?: Array<{
    id: string
    name: string
    description?: string
  }>
}

interface A2AJsonRpcRequest {
  jsonrpc: '2.0'
  id: string
  method: string
  params?: Record<string, unknown>
}

interface A2AJsonRpcResponse {
  jsonrpc: '2.0'
  id: string
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

/**
 * Fetch the agent card from the A2A server
 */
async function getAgentCard(
  serverUrl: string,
  timeout: number,
  customHeaders: Record<string, string> = {}
): Promise<A2AAgentCard> {
  const cardUrl = new URL('/.well-known/agent-card.json', serverUrl).toString()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(cardUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...customHeaders,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Failed to fetch agent card: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Agent card request timed out after ${timeout}ms`)
    }
    throw error
  }
}

/**
 * Send a message to the A2A server using JSON-RPC
 */
async function sendA2AMessage(
  serverUrl: string,
  message: A2AMessage,
  timeout: number,
  customHeaders: Record<string, string> = {}
): Promise<A2AJsonRpcResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  const jsonRpcRequest: A2AJsonRpcRequest = {
    jsonrpc: '2.0',
    id: uuidv4(),
    method: 'message/send',
    params: {
      message,
    },
  }

  try {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...customHeaders,
      },
      body: JSON.stringify(jsonRpcRequest),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`A2A request failed: ${response.status} ${response.statusText} - ${errorText}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`A2A request timed out after ${timeout}ms`)
    }
    throw error
  }
}

/**
 * Extract text response from A2A JSON-RPC response
 */
function extractTextResponse(response: A2AJsonRpcResponse): string {
  if (response.error) {
    throw new Error(`A2A error: ${response.error.message}`)
  }

  const result = response.result as Record<string, unknown> | undefined

  // Handle message response
  if (result && typeof result === 'object') {
    // Direct message response
    if ('parts' in result && Array.isArray(result.parts)) {
      return result.parts
        .filter((part: A2APart) => part.kind === 'text')
        .map((part: A2APart) => part.text)
        .join('\n')
    }

    // Task response with message
    if ('message' in result && typeof result.message === 'object' && result.message !== null) {
      const message = result.message as Record<string, unknown>
      if ('parts' in message && Array.isArray(message.parts)) {
        return message.parts
          .filter((part: A2APart) => part.kind === 'text')
          .map((part: A2APart) => part.text)
          .join('\n')
      }
    }

    // Task response with artifacts
    if ('artifacts' in result && Array.isArray(result.artifacts)) {
      const texts: string[] = []
      for (const artifact of result.artifacts) {
        if (artifact.parts && Array.isArray(artifact.parts)) {
          texts.push(
            ...artifact.parts
              .filter((part: A2APart) => part.kind === 'text')
              .map((part: A2APart) => part.text)
          )
        }
      }
      if (texts.length > 0) {
        return texts.join('\n')
      }
    }

    // Task status message
    if ('status' in result && typeof result.status === 'object' && result.status !== null) {
      const status = result.status as Record<string, unknown>
      if ('message' in status && typeof status.message === 'object' && status.message !== null) {
        const statusMessage = status.message as Record<string, unknown>
        if ('parts' in statusMessage && Array.isArray(statusMessage.parts)) {
          return statusMessage.parts
            .filter((part: A2APart) => part.kind === 'text')
            .map((part: A2APart) => part.text)
            .join('\n')
        }
      }
    }
  }

  return ''
}

/**
 * POST handler for A2A message sending
 */
export async function POST(request: Request) {
  const requestId = generateRequestId()

  try {
    const body = await request.json()
    const validatedData = a2aRequestSchema.parse(body)

    // Transform headers from table format to object
    const customHeaders = transformHeaders(validatedData.headers)
    
    logger.info(`[${requestId}] A2A request to ${validatedData.serverUrl}`, {
      hasCustomHeaders: Object.keys(customHeaders).length > 0,
    })

    // First, fetch the agent card to verify the server is A2A-compliant
    let agentCard: A2AAgentCard
    try {
      agentCard = await getAgentCard(validatedData.serverUrl, validatedData.timeout, customHeaders)
      logger.info(`[${requestId}] Connected to A2A agent: ${agentCard.name}`)
    } catch (error) {
      logger.error(`[${requestId}] Failed to fetch agent card:`, error)
      return NextResponse.json(
        {
          success: false,
          error: `Failed to connect to A2A server: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 502 }
      )
    }

    // Create the A2A message
    const message: A2AMessage = {
      kind: 'message',
      messageId: uuidv4(),
      role: 'user',
      parts: [
        {
          kind: 'text',
          text: validatedData.prompt,
        },
      ],
    }

    // Send the message
    let response: A2AJsonRpcResponse
    try {
      response = await sendA2AMessage(validatedData.serverUrl, message, validatedData.timeout, customHeaders)
    } catch (error) {
      logger.error(`[${requestId}] A2A message send failed:`, error)
      return NextResponse.json(
        {
          success: false,
          error: `A2A communication failed: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 502 }
      )
    }

    // Extract the text response
    const textResponse = extractTextResponse(response)

    logger.info(`[${requestId}] A2A response received from ${agentCard.name}`)

    return NextResponse.json({
      success: true,
      response: textResponse,
      agentName: agentCard.name,
      taskId: response.id,
      status: 'completed',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
        },
        { status: 400 }
      )
    }

    logger.error(`[${requestId}] A2A request error:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}
