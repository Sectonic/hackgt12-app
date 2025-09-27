// ------------------- Functions for Data-Only SSE Format -------------------

/**
 * Uses SSE data-only format.
 * Only uses 'event: done' with empty data for completion.
 * All other content goes through 'data:' field only.
 */
export function createSSEStream(
  cb: (controller: ReadableStreamDefaultController<Uint8Array>) => Promise<void>,
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await cb(controller);
        // Signal completion with empty data
        controller.enqueue(encoder.encode('event: done\n'));
        controller.enqueue(encoder.encode('data:\n\n'));
      } catch (err) {
        console.error('Error during SSE stream', err);

        const message = err instanceof Error ? err.message : 'Internal error';
        controller.enqueue(encoder.encode('data: '));
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'error', message })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

/**
 * Emit any JSON object as a data event.
 * Used for actions, tool responses, custom events, etc.
 */
export function streamJSONEvent<T>(
  controller: ReadableStreamDefaultController<Uint8Array>,
  eventType: string,
  eventData: T,
) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode('data: '));
  controller.enqueue(encoder.encode(`${JSON.stringify(eventData)}\n\n`));
}

/**
 * Handles streaming of text chunks to SSE controller for Mastra's streamVNext compatibility
 *
 * @param streamResult - The StreamTextResult from an AI agent
 * @param streamController - Optional SSE stream controller
 * @returns Promise<string> - The complete response text
 */
export async function handleTextStream(
  chunk: string,
  streamController: ReadableStreamDefaultController<Uint8Array>,
): Promise<string> {
  const encoder = new TextEncoder();
  // Proper SSE formatting: each data line should begin with 'data: '
  // Split on real newlines so multi-line model deltas render correctly client-side.
  const lines = chunk.split(/\r?\n/);
  for (const line of lines) {
    // Skip sending an empty trailing line caused by split on ending newline; preserve intentional blanks.
    if (line.length === 0) {
      continue;
    }
    streamController.enqueue(encoder.encode(`data: ${line}\n`));
  }
  // Terminate this SSE message block
  streamController.enqueue(encoder.encode(`\n`));
  return chunk;
}

/**
 * Streams a text delta as a JSON SSE event with a standard envelope.
 * This helps frontend parsers that expect structured events.
 */
export function streamTextDeltaJSON(
  controller: ReadableStreamDefaultController<Uint8Array>,
  text: string,
  meta: Record<string, unknown> = {},
) {
  const encoder = new TextEncoder();
  const payload = { type: 'text-delta', text, ...meta };
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}
