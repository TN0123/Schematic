import { perplexity } from '@ai-sdk/perplexity';
import { generateText, tool } from 'ai';
import { z } from 'zod';

// Optional callback allows callers to receive structured search metadata (e.g., sources and query)
export function createWebSearchTool(onResult?: (data: { text: string; sources: string[]; query: string }) => void) {
  return tool({
    description: "Search the web for current information to help answer the user's question. Use this when the user asks about recent events, current data, or information that may have changed recently.",
    inputSchema: z.object({
      query: z.string().describe("The search query to find relevant current information")
    }),
    execute: async (input, options) => {
      try {
        console.log('[WebSearch] execute start', { query: input?.query });
        const result = await generateText({
          model: perplexity('sonar'),
          messages: [{ role: 'user', content: input.query }],
        });

        // Debug logging to understand provider result shape (kept concise)
        try {
          const anyResult = result as unknown as {
            response?: { body?: unknown };
            content?: Array<{ type?: string; url?: string; [k: string]: unknown }>;
            providerMetadata?: unknown;
          };
          const responseBodyType = typeof anyResult?.response?.body;
          const responseBodyPreview = responseBodyType === 'string'
            ? String(anyResult?.response?.body).slice(0, 400)
            : null;
          const contentTypes = Array.isArray(anyResult?.content)
            ? anyResult!.content!.map((p) => p?.type).slice(0, 10)
            : null;
          // eslint-disable-next-line no-console
          console.log('[WebSearch] Perplexity result summary', {
            responseBodyType,
            responseBodyPreview,
            hasContentArray: Array.isArray(anyResult?.content),
            contentTypes,
            hasProviderMetadata: !!anyResult?.providerMetadata,
          });
        } catch {}

        // Attempt to extract citations/sources from provider response metadata or content
        const sources: string[] = [];

        // Some providers expose raw response on result.response.body (JSON string)
        // Try to parse if available to read `citations` returned by Perplexity.
        try {
          const anyResult = result as unknown as { response?: { body?: unknown } };
          const body = anyResult?.response?.body as unknown;
          if (typeof body === 'string') {
            const parsed = JSON.parse(body);
            if (parsed && Array.isArray(parsed.citations)) {
              sources.push(...parsed.citations.filter((u: unknown) => typeof u === 'string'));
            }
          }
        } catch {
          // ignore parse errors and fall back
        }

        // As a fallback, try to collect sources from the structured content parts if present
        try {
          const anyResult2 = result as unknown as { content?: Array<{ type?: string; url?: string }> };
          const content = anyResult2?.content;
          if (Array.isArray(content)) {
            for (const part of content) {
              if (part && part.type === 'source' && typeof part.url === 'string') {
                sources.push(part.url);
              }
            }
          }
        } catch {
          // ignore
        }

        // De-duplicate while preserving order
        const uniqueSources = Array.from(new Set(sources));

        // Notify caller if provided
        try {
          console.log('[WebSearch] parsed sources', { count: uniqueSources.length });
          onResult?.({ text: result.text, sources: uniqueSources, query: input.query });
        } catch {}

        return result.text;
      } catch (error) {
        console.error('Web search error:', error);
        return 'Web search failed. Please try again.';
      }
    }
  });
}

