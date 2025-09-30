import type {
  ProviderImplementation,
  CustomParams,
  CustomProviderConfig,
  LLMResponse,
  StreamHandler,
  StreamResponse,
  StreamEvent,
  StructuredParams,
} from 'cedar-os';

type CustomConfig = {
  provider: 'custom';
  config: CustomProviderConfig;
};

// Custom provider that connects directly to our Mastra server
export const mastraCustomProvider: ProviderImplementation<CustomParams, CustomConfig> = {
  callLLM: async (params, config) => {
    const { prompt, systemPrompt, temperature, maxTokens, ...rest } = params;
    const baseURL = config.config.baseURL || 'http://localhost:4111';

    const response = await fetch(`${baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.config.apiKey ? { Authorization: `Bearer ${config.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        systemPrompt,
        temperature,
        maxTokens,
        ...rest,
      }),
    });

    return mastraCustomProvider.handleResponse(response);
  },

  callLLMStructured: async (params, config) => {
    const {
      prompt,
      systemPrompt,
      schema,
      schemaName,
      schemaDescription,
      temperature,
      maxTokens,
      ...rest
    } = params;
    const baseURL = config.config.baseURL || 'http://localhost:4111';

    // For now, use regular chat and try to parse JSON from response
    const response = await fetch(`${baseURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.config.apiKey ? { Authorization: `Bearer ${config.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        prompt: `${prompt}\n\nPlease respond with valid JSON matching this schema: ${JSON.stringify(schema)}`,
        systemPrompt: systemPrompt
          ? `${systemPrompt}\n\nAlways respond with valid JSON.`
          : 'Always respond with valid JSON.',
        temperature,
        maxTokens,
        ...rest,
      }),
    });

    const result = await mastraCustomProvider.handleResponse(response);

    // Try to parse structured output
    if (schema && result.content) {
      try {
        result.object = JSON.parse(result.content);
      } catch {
        // Leave object undefined if parsing fails
      }
    }

    return result;
  },

  streamLLM: (params, config, handler) => {
    const abortController = new AbortController();
    const baseURL = config.config.baseURL || 'http://localhost:4111';

    const completion = (async () => {
      try {
        const { prompt, systemPrompt, temperature, maxTokens, ...rest } = params;

        const response = await fetch(`${baseURL}/api/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.config.apiKey ? { Authorization: `Bearer ${config.config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            prompt,
            systemPrompt,
            temperature,
            maxTokens,
            ...rest,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Handle Server-Sent Events stream
        await handleEventStream(response, {
          onMessage: (chunk) => {
            try {
              const data = JSON.parse(chunk);
              if (data.type === 'chunk' && data.content) {
                handler({ type: 'chunk', content: data.content });
              } else if (data.type === 'done') {
                handler({ type: 'done' });
              }
            } catch {
              // Skip parsing errors
            }
          },
          onDone: () => {
            handler({ type: 'done' });
          },
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          handler({ type: 'error', error });
        }
      }
    })();

    return {
      abort: () => abortController.abort(),
      completion,
    };
  },

  handleResponse: async (response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.content || '',
      usage: data.usage || undefined,
      metadata: {
        model: 'mastra-chat-agent',
        // Add any other relevant metadata
      },
    };
  },
};

// Helper function to handle Server-Sent Events streams
async function handleEventStream(
  response: Response,
  handler: {
    onMessage: (chunk: string) => void;
    onDone: () => void;
  },
) {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        handler.onDone();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim()) {
            handler.onMessage(data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
