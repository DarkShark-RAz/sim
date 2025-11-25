/**
 * Server-side provider registry
 * This file imports actual provider implementations and should ONLY be used server-side
 */

import { createLogger } from '@/lib/logs/console/logger'
import { anthropicProvider } from '@/providers/anthropic'
import { azureOpenAIProvider } from '@/providers/azure-openai'
import { cerebrasProvider } from '@/providers/cerebras'
import { deepseekProvider } from '@/providers/deepseek'
import { googleProvider } from '@/providers/google'
import { groqProvider } from '@/providers/groq'
import { mistralProvider } from '@/providers/mistral'
import {
  getComputerUseModels,
  getProviderModels as getProviderModelsFromDefinitions,
  PROVIDER_DEFINITIONS,
  updateOllamaModels as updateOllamaModelsInDefinitions,
} from '@/providers/models'
import { ollamaProvider } from '@/providers/ollama'
import { openaiProvider } from '@/providers/openai'
import { openRouterProvider } from '@/providers/openrouter'
import type { ProviderConfig, ProviderId } from '@/providers/types'
import { vllmProvider } from '@/providers/vllm'
import { xAIProvider } from '@/providers/xai'

const logger = createLogger('ProviderRegistry')

/**
 * Server-side provider registry with full implementations
 */
export const providers: Record<
  ProviderId,
  ProviderConfig & {
    models: string[]
    computerUseModels?: string[]
    modelPatterns?: RegExp[]
  }
> = {
  openai: {
    ...openaiProvider,
    models: getProviderModelsFromDefinitions('openai'),
    computerUseModels: ['computer-use-preview'],
    modelPatterns: PROVIDER_DEFINITIONS.openai.modelPatterns,
  },
  anthropic: {
    ...anthropicProvider,
    models: getProviderModelsFromDefinitions('anthropic'),
    computerUseModels: getComputerUseModels().filter((model) =>
      getProviderModelsFromDefinitions('anthropic').includes(model)
    ),
    modelPatterns: PROVIDER_DEFINITIONS.anthropic.modelPatterns,
  },
  google: {
    ...googleProvider,
    models: getProviderModelsFromDefinitions('google'),
    modelPatterns: PROVIDER_DEFINITIONS.google.modelPatterns,
  },
  deepseek: {
    ...deepseekProvider,
    models: getProviderModelsFromDefinitions('deepseek'),
    modelPatterns: PROVIDER_DEFINITIONS.deepseek.modelPatterns,
  },
  xai: {
    ...xAIProvider,
    models: getProviderModelsFromDefinitions('xai'),
    modelPatterns: PROVIDER_DEFINITIONS.xai.modelPatterns,
  },
  cerebras: {
    ...cerebrasProvider,
    models: getProviderModelsFromDefinitions('cerebras'),
    modelPatterns: PROVIDER_DEFINITIONS.cerebras.modelPatterns,
  },
  groq: {
    ...groqProvider,
    models: getProviderModelsFromDefinitions('groq'),
    modelPatterns: PROVIDER_DEFINITIONS.groq.modelPatterns,
  },
  vllm: {
    ...vllmProvider,
    models: getProviderModelsFromDefinitions('vllm'),
    modelPatterns: PROVIDER_DEFINITIONS.vllm.modelPatterns,
  },
  mistral: {
    ...mistralProvider,
    models: getProviderModelsFromDefinitions('mistral'),
    modelPatterns: PROVIDER_DEFINITIONS.mistral.modelPatterns,
  },
  'azure-openai': {
    ...azureOpenAIProvider,
    models: getProviderModelsFromDefinitions('azure-openai'),
    modelPatterns: PROVIDER_DEFINITIONS['azure-openai'].modelPatterns,
  },
  openrouter: {
    ...openRouterProvider,
    models: getProviderModelsFromDefinitions('openrouter'),
    modelPatterns: PROVIDER_DEFINITIONS.openrouter.modelPatterns,
  },
  ollama: {
    ...ollamaProvider,
    models: getProviderModelsFromDefinitions('ollama'),
    modelPatterns: PROVIDER_DEFINITIONS.ollama.modelPatterns,
  },
}

// Initialize providers
Object.entries(providers).forEach(([id, provider]) => {
  if (provider.initialize) {
    provider.initialize().catch((error) => {
      logger.error(`Failed to initialize ${id} provider`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    })
  }
})

export function updateOllamaProviderModels(models: string[]): void {
  updateOllamaModelsInDefinitions(models)
  providers.ollama.models = getProviderModelsFromDefinitions('ollama')
}

export function updateVLLMProviderModels(models: string[]): void {
  const { updateVLLMModels } = require('@/providers/models')
  updateVLLMModels(models)
  providers.vllm.models = getProviderModelsFromDefinitions('vllm')
}

export async function updateOpenRouterProviderModels(models: string[]): Promise<void> {
  const { updateOpenRouterModels } = await import('@/providers/models')
  updateOpenRouterModels(models)
  providers.openrouter.models = getProviderModelsFromDefinitions('openrouter')
}

export function getProvider(providerId: string): ProviderConfig | undefined {
  return providers[providerId as ProviderId]
}
