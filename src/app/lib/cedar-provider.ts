// Cedar Provider Configuration
// This file sets up the provider configuration for Cedar to communicate with the backend

export interface CedarProvider {
  sendMessage: (message: string, options?: any) => Promise<ReadableStream>;
  apiUrl: string;
  endpoints: {
    chat: string;
    chatStream: string;
  };
}

export const cedarProvider: CedarProvider = {
  apiUrl: 'http://localhost:4114',
  endpoints: {
    chat: '/api/agents/agentCreatePlan',
    chatStream: '/api/agents/agentCreatePlan/stream',
  },
  sendMessage: async (message: string, options: any = {}) => {
    const response = await fetch('http://localhost:4114/api/agents/agentCreatePlan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: message,
        ...options,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body;
  },
};

// Make provider available globally for Cedar
if (typeof window !== 'undefined') {
  (window as any).__CEDAR_PROVIDER__ = cedarProvider;
}

export default cedarProvider;
