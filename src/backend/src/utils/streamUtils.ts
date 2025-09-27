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
 * Use this to stream structured data like tool results, progress updates, or custom events.
 */
export function streamJSONEvent<T>(
  controller: ReadableStreamDefaultController<Uint8Array>,
  eventData: T,
) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode('data: '));
  controller.enqueue(encoder.encode(`${JSON.stringify(eventData)}\n\n`));
}

/**
 * Handles streaming of text chunks using data-only format.
 * Pass your agent's stream result and the controller to stream text chunks to frontend.
 */
export async function handleTextStream(
  streamResult: { textStream: AsyncIterable<string> },
  streamController: ReadableStreamDefaultController<Uint8Array>,
): Promise<string> {
  const encoder = new TextEncoder();
  const chunks: string[] = [];

  // Stream raw text chunks through data field
  for await (const chunk of streamResult.textStream) {
    chunks.push(chunk);
    // Escape literal newlines for SSE compliance
    const escaped = chunk.replace(/\n/g, '\\n');
    streamController.enqueue(encoder.encode(`data: ${escaped}\n\n`));
  }

  return chunks.join('');
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
