import { NextRequest } from "next/server";
import { streamText, generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { PrismaClient } from "@prisma/client";
import { contextUpdate } from "@/scripts/notebook/context-update";
import { canUsePremiumModel, trackPremiumUsage } from "@/lib/subscription";
import { createWebSearchTool } from "@/scripts/notebook/web-search";

const prisma = new PrismaClient();

/**
 * Strips all markdown syntax from text, converting it to plain text.
 * Handles bold, italic, headers, links, code blocks, lists, and other markdown elements.
 */
function stripMarkdown(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let cleaned = text;

  // Remove code blocks (```code```)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, (match) => {
    // Extract content between ``` markers
    const content = match.replace(/```/g, '').trim();
    return content;
  });

  // Remove inline code (`code`)
  cleaned = cleaned.replace(/`([^`]+)`/g, '$1');

  // Remove images ![alt](url) -> alt
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');

  // Remove links [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

  // Remove reference-style links [text][ref] -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\[[^\]]+\]/g, '$1');

  // Remove strikethrough ~~text~~
  cleaned = cleaned.replace(/~~([^~]+?)~~/g, '$1');

  // Remove bold **text** or __text__ (using non-greedy matching for better edge case handling)
  // Match **text** - non-greedy match of any characters between ** markers
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, '$1');
  // Handle __text__ bold with underscores (non-greedy)
  cleaned = cleaned.replace(/__(.+?)__/g, '$1');

  // Remove italic *text* or _text_ (be careful not to remove underscores in words)
  // This regex looks for * or _ that have word boundaries
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  // For underscores, only remove if they're standalone (not part of a word)
  cleaned = cleaned.replace(/(^|\s)_([^_]+)_(\s|$)/g, '$1$2$3');
  cleaned = cleaned.replace(/(^|\s)_([^_]+)_/g, '$1$2');

  // Remove headers (# Header)
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1');

  // Remove blockquotes (> quote)
  cleaned = cleaned.replace(/^>\s+(.+)$/gm, '$1');

  // Remove horizontal rules (---, ___, ***)
  cleaned = cleaned.replace(/^[-*_]{3,}$/gm, '');

  // Remove list markers (-, *, +) at start of lines
  cleaned = cleaned.replace(/^[\s]*[-*+]\s+(.+)$/gm, '$1');

  // Remove numbered list markers (1., 2., etc.)
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+(.+)$/gm, '$1');

  // Clean up excessive whitespace (multiple newlines -> single newline)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

// Schema for change map generation
const changeMapSchema = z.object({
  changes: z
    .array(
      z.object({
        original: z.string().describe("The original text to replace, or '!ADD_TO_END!' to append new content"),
        replacement: z.string().describe("The new text to replace the original with"),
      })
    )
    .describe("An array of text replacements to apply to the document"),
});

export async function POST(req: NextRequest) {
  try {
    const {
      currentText,
      instructions,
      history = [],
      userId,
      documentId,
      model = "basic",
      actionMode = "edit",
      images = [],
      webSearchEnabled = false,
    } = await req.json();

    // Get document context
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: { context: true },
    });

    const context = document?.context;

    // Select model and check usage
    let selectedModelProvider = google("gemini-2.5-flash");
    let remainingUses: number | null = null;

    // Support explicit model selection: "basic" | "gpt-4.1" | "claude-sonnet-4-5"
    if ((model === "gpt-4.1" || model === "claude-sonnet-4-5") && userId) {
      try {
        // Check if user can use premium models
        const usageCheck = await canUsePremiumModel(userId);

        if (usageCheck.allowed) {
          if (model === "gpt-4.1") {
            selectedModelProvider = openai("gpt-4.1");
          } else if (model === "claude-sonnet-4-5") {
            const anthropicModelId = "claude-sonnet-4-5-20250929";
            selectedModelProvider = anthropic(anthropicModelId);
          }

          // Track the usage
          const usageResult = await trackPremiumUsage(userId);
          remainingUses = usageResult.remainingUses;
          
        } else {
          // Fall back to Gemini if limit reached
          selectedModelProvider = google("gemini-2.5-flash");
        }
      } catch (error) {
        console.error("Error checking premium usage:", error);
        // Fall back to Gemini
        selectedModelProvider = google("gemini-2.5-flash");
      }
    } else {
      // Use Gemini for basic model
      selectedModelProvider = google("gemini-2.5-flash");
      
    }

    // Configure web search tool if enabled
    let webSearchTool: any = undefined;
    let searchWasUsed = false;
    const collectedSources: string[] = [];
    let collectedQuery: string | null = null;
    let collectedSearchText: string | null = null;

    if (webSearchEnabled && userId) {
      // Check if user has premium uses available
      const usageCheck = await canUsePremiumModel(userId);
      
      if (usageCheck.allowed) {
        webSearchTool = createWebSearchTool((data) => {
          try {
            if (typeof data?.text === 'string') {
              collectedSearchText = data.text;
            }
            if (Array.isArray(data?.sources)) {
              for (const url of data.sources) {
                if (typeof url === 'string' && !collectedSources.includes(url)) {
                  collectedSources.push(url);
                }
              }
            }
            if (typeof data?.query === 'string') {
              collectedQuery = data.query;
            }
          } catch (error) {
            console.error(`[NOTEBOOK_CHAT] Error in web search callback:`, error);
          }
        });
      }
    }

    if (actionMode === "ask") {
      // ASK MODE: Simple streaming text response
      const systemPrompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has asked you a question about their work.

        Here is general context around what the user is working on (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        Your job is to understand what the user has written so far and answer their question or provide guidance based on their request.
        ${images && images.length > 0 ? "The user has also provided images for you to analyze. Use the visual information from the images to help answer their question or provide better guidance." : ""}
        ${webSearchTool ? "IMPORTANT: The user has enabled web search. You MUST call the web_search tool with a concise, relevant query to fetch current information that will help you answer their question. Always call this tool first before providing your answer. After the tool returns results, use those results to inform your answer. Incorporate the search findings naturally into your response." : ""}
        
        You should only return a text response answering the user's question or addressing their request. Do not make any changes to their text.
        
        Your response MUST be written in natural, plain, human-like text — STRICTLY AVOID using Markdown formatting such 
        as **bold**, _italics_, or any other markup. Do not format text using asterisks, underscores, 
        or similar characters. AVOID artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
        
        DO NOT include any other text in your response, only your answer to the user's question.

        Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      `;

      const userPrompt = `
        Here is the current text:
        """
        ${currentText}
        """

        Here is what the user asked for:
        """
        ${instructions}
        """
      `;

      // Build user message content parts
      const userContent: any[] = [{ type: "text", text: userPrompt }];
      if (images && images.length > 0) {
        images.forEach((img: any) => {
          let imageData: string;
          if (typeof img === "string") {
            imageData = img;
          } else if (img && typeof img === "object") {
            // Prefer using the url if available (it's already a complete data URL)
            if (img.url) {
              imageData = img.url;
            } else if (img.base64 && img.mimeType) {
              // Construct proper data URL format
              const dataUrl = `data:${img.mimeType};base64,${img.base64}`;
              imageData = dataUrl;
            } else {
              return;
            }
          } else {
            return;
          }
          // Use the standard AI SDK format for images
          userContent.push({ type: "image", image: imageData });
        });
      }

      // Build messages array using standard Vercel AI SDK format
      const messages: any[] = [
        {
          role: "system",
          content: systemPrompt,
        },
        ...history.map((entry: any) => {
          const role = (entry.role === "model" ? "assistant" : entry.role);

          let textContent = "";
          if (typeof entry.parts === "string") {
            textContent = entry.parts;
          } else if (Array.isArray(entry.parts)) {
            textContent = entry.parts
              .map((p: any) => (typeof p === "string" ? p : p?.text ?? ""))
              .join("");
          } else if (entry.parts && typeof entry.parts === "object") {
            textContent = entry.parts.text ?? String(entry.parts);
          }

          return { role, content: textContent };
        }),
        { role: "user", content: userContent },
      ];

      let fullResponse = "";
      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (eventType: string, data: any) => {
            const sseData = `event: ${eventType}\ndata: ${JSON.stringify(
              data
            )}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          };

          try {
            sendEvent("status", { message: "Starting AI processing..." });

            // Track web search status
            let isSearching = false;

            const streamTextConfig: any = {
              model: selectedModelProvider,
              messages,
            };

            if (webSearchTool) {
              streamTextConfig.tools = { web_search: webSearchTool };
              streamTextConfig.toolChoice = 'auto'; // Use auto so model can generate text after tool call
              streamTextConfig.maxSteps = 5;
              streamTextConfig.onStepFinish = async (step: any) => {
                if (step.toolCalls && step.toolCalls.length > 0) {
                  searchWasUsed = true;
                  
                  // Check if web search tool was called
                  const hasWebSearch = step.toolCalls.some(
                    (call: any) => call.toolName === 'web_search'
                  );
                  
                  if (hasWebSearch && !isSearching) {
                    isSearching = true;
                    sendEvent("status", { message: "searching", isSearching: true });
                  }
                  
                  try {
                    const callsAny = step.toolCalls as unknown as Array<{ toolName?: string; args?: any }>;
                    const first = callsAny[0];
                    const q = first?.args?.query;
                    if (typeof q === 'string') {
                      collectedQuery = q;
                    }
                  } catch (error) {
                    console.error(`[NOTEBOOK_CHAT:ASK] Error extracting query:`, error);
                  }
                }
                
                // If step has text and we were searching, clear searching status
                if (step.text && isSearching) {
                  isSearching = false;
                  sendEvent("status", { message: "generating", isSearching: false });
                }
              };
            }

            const result = await streamText(streamTextConfig);

            // Stream text deltas
            for await (const delta of result.textStream) {
              fullResponse += delta;
              
              // Clear searching status once text starts streaming
              if (isSearching) {
                isSearching = false;
                sendEvent("status", { message: "generating", isSearching: false });
              }
              
              // Send raw delta without markdown stripping for assistant messages
              sendEvent("assistant-delta", { delta });
            }

            // No markdown stripping for assistant messages
            sendEvent("assistant-complete", { text: fullResponse });
            

            // Update conversation history
            const updatedHistory = [
              ...history,
              { role: "user", parts: userPrompt },
              { role: "model", parts: fullResponse },
            ];

            // Update context
            sendEvent("status", { message: "Updating context..." });
            
            let contextUpdateResult;
            try {
              contextUpdateResult = await contextUpdate(
                updatedHistory,
                documentId
              );
            } catch (error) {
              console.error("Context update failed:", error);
              contextUpdateResult = {
                contextUpdated: false,
                contextChange: null,
              };
            }
            

            // Track premium usage if search was used
            if (searchWasUsed && userId) {
              const usageResult = await trackPremiumUsage(userId);
              remainingUses = usageResult.remainingUses;
            }

            sendEvent("result", {
              result: fullResponse,
              history: updatedHistory,
              remainingUses,
              searchUsed: searchWasUsed,
              searchQuery: collectedQuery,
              searchSources: collectedSources,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "ask",
            });
            

            sendEvent("complete", { message: "Processing complete" });
            
          } catch (error) {
            
            sendEvent("error", {
              error: "Failed to generate content",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    } else {
      // EDIT MODE: Stream assistant text + generate change map JSON
      const assistantTextPrompt = `
        You are an AI writing assistant embedded in a text editor. A user is working on writing something and has requested something of you.

        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
        BEGINNING OF CONTEXT
        ${context}
        END OF CONTEXT

        ${images && images.length > 0 ? "The user has also provided images for you to analyze. Use the visual information from the images to better understand their request and provide more relevant changes." : ""}
        ${webSearchTool ? "IMPORTANT: The user has enabled web search. You MUST call the web_search tool with a concise, relevant query to fetch current information that will help you fulfill their request. Always call this tool first before providing your response. After the tool returns results, use those results to inform your response and the changes you make." : ""}

        Your job is to provide a brief, friendly response to the user explaining what changes you're making to their text.
        
        Your response should be conversational and helpful, explaining your approach or reasoning.
        
        Your response MUST be written in natural, plain, human-like text — STRICTLY AVOID using Markdown formatting such 
        as **bold**, _italics_, or any other markup. DO NOT format text using asterisks, underscores, 
        or similar characters. AVOID artificial section headers (e.g., "Feature Review:" or 
        "Improvement Suggestion:") — just write as a human might naturally continue or respond.
        
        Keep your response concise (2-3 sentences maximum).

        Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      `;

      // (Moved changeMapPrompt construction to after assistant stream so it can include any web findings.)

      const userPrompt = `
        Here is the current text:
        """
        ${currentText}
        """

        Here is what the user asked for:
        """
        ${instructions}
        """
      `;

      // Build user message content parts
      const userContent: any[] = [{ type: "text", text: userPrompt }];
      if (images && images.length > 0) {
        images.forEach((img: any) => {
          let imageData: string;
          if (typeof img === "string") {
            imageData = img;
          } else if (img && typeof img === "object") {
            // Prefer using the url if available (it's already a complete data URL)
            if (img.url) {
              imageData = img.url;
            } else if (img.base64 && img.mimeType) {
              // Construct proper data URL format
              const dataUrl = `data:${img.mimeType};base64,${img.base64}`;
              imageData = dataUrl;
            } else {
              return;
            }
          } else {
            return;
          }
          // Use the standard AI SDK format for images
          userContent.push({ type: "image", image: imageData });
        });
      }

      // Build messages array using standard Vercel AI SDK format
      const uiMessages = [
        ...history.map((entry: any) => {
          const role = (entry.role === "model" ? "assistant" : entry.role);

          let textContent = "";
          if (typeof entry.parts === "string") {
            textContent = entry.parts;
          } else if (Array.isArray(entry.parts)) {
            textContent = entry.parts
              .map((p: any) => (typeof p === "string" ? p : p?.text ?? ""))
              .join("");
          } else if (entry.parts && typeof entry.parts === "object") {
            textContent = entry.parts.text ?? String(entry.parts);
          }

          return { role, content: textContent };
        }),
        { role: "user", content: userContent },
      ];

      const encoder = new TextEncoder();

      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (eventType: string, data: any) => {
            const sseData = `event: ${eventType}\ndata: ${JSON.stringify(
              data
            )}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          };

          try {
            sendEvent("status", { message: "Starting AI processing..." });

            // Stream assistant text first (with optional tool use)
            const assistantMessages = [
              {
                role: "system",
                content: assistantTextPrompt,
              },
              ...uiMessages,
            ];

            let assistantFullText = "";
            let cleanedAssistantFullText = "";
            let changeMapGenerationStarted = false;
            let changeMapPromise: Promise<any> | null = null;

            // Track web search status
            let isSearching = false;

            // Start streaming assistant text immediately
            let deltaCount = 0;
            
            const assistantStreamPromise = (async () => {
              try {
            
            const streamTextConfig: any = {
                  model: selectedModelProvider,
                  messages: assistantMessages,
                };

                if (webSearchTool) {
                  streamTextConfig.tools = { web_search: webSearchTool };
                  streamTextConfig.toolChoice = 'auto'; // Use auto so model can generate text after tool call
                  streamTextConfig.maxSteps = 5;
                  streamTextConfig.onStepFinish = async (step: any) => {
                    if (step.toolCalls && step.toolCalls.length > 0) {
                      searchWasUsed = true;
                      
                      // Check if web search tool was called
                      const hasWebSearch = step.toolCalls.some(
                        (call: any) => call.toolName === 'web_search'
                      );
                      
                      if (hasWebSearch && !isSearching) {
                        isSearching = true;
                        sendEvent("status", { message: "searching", isSearching: true });
                      }
                      
                      try {
                        const callsAny = step.toolCalls as unknown as Array<{ toolName?: string; args?: any }>;
                        const first = callsAny[0];
                        const q = first?.args?.query;
                        if (typeof q === 'string') {
                          collectedQuery = q;
                        }
                      } catch (error) {
                        console.error(`[NOTEBOOK_CHAT:EDIT] Error extracting query:`, error);
                      }
                    }
                    
                    // If step has text and we were searching, clear searching status
                    if (step.text && isSearching) {
                      isSearching = false;
                      sendEvent("status", { message: "generating", isSearching: false });
                    }
                  };
                }

                const result = await streamText(streamTextConfig);

                for await (const delta of result.textStream) {
                  assistantFullText += delta;
                  deltaCount++;
                  
                  // Clear searching status once text starts streaming
                  if (isSearching) {
                    isSearching = false;
                    sendEvent("status", { message: "generating", isSearching: false });
                  }
                  
                  // Send raw delta without markdown stripping for assistant messages
                  cleanedAssistantFullText += delta;
                  
                  sendEvent("assistant-delta", { delta });

                  // PARALLELIZATION: Start change map generation early once we have enough text
                  // BUT: If web search is enabled, don't start early - wait for search results first
                  // Trigger after ~1000 characters or 20 deltas (whichever comes first)
                  // Skip early generation if web search is enabled (we'll do it after stream completes)
                  if (!changeMapGenerationStarted && 
                      !webSearchTool && // Don't start early if web search is enabled
                      (assistantFullText.length > 1000 || deltaCount > 20)) {
                    changeMapGenerationStarted = true;
                    
                    // Start change map generation in parallel (don't await yet)
                    changeMapPromise = (async () => {

                      // Build the change map prompt with current assistant text (may be partial)
                      const changeMapPrompt = `
                        You are an AI writing assistant that generates precise text edit instructions. A user is working on a document and has requested changes.

                        Here is the context for what the user is writing (will be empty if the user has not written anything yet):
                        BEGINNING OF CONTEXT
                        ${context}
                        END OF CONTEXT

                        ${images && images.length > 0 ? "The user has also provided images for you to analyze. Use the visual information from the images to understand what content they want to add or how they want to modify their text based on the images." : ""}

                        ${collectedSearchText ? `The assistant has run a web search with the query "${collectedQuery ?? ''}" and obtained the following findings. Base your changes on these findings when relevant, and ensure factual accuracy:\n\nBEGIN WEB FINDINGS\n${collectedSearchText}\nEND WEB FINDINGS` : ''}

                        ${assistantFullText ? `The assistant has started explaining the changes:\n"${assistantFullText}"\n\n` : ''}

                        Your job is to analyze the current text and the user's request, then generate an array of changes.
                        
                        Each change has an "original" field (the text to replace) and a "replacement" field (the new text).
                        
                        Rules for generating changes:
                        1. If the user's document is empty and they want you to create new content, use "!ADD_TO_END!" as the original and the new content as the replacement
                        2. If you need to append new content to the end of existing text, use "!ADD_TO_END!" as the original and the content to append as the replacement
                        3. For edits/replacements, use the EXACT original text snippet as the original, and the replacement text as the replacement
                        4. Choose text snippets that are unique enough to be found in the document (include enough context)
                        5. If replacing multiple separate sections, create multiple change objects in the array
                        6. Keep the snippets focused on what actually needs to change - don't include large unchanged portions
                        7. If the user asks you to delete something, use the original text as original and an empty string "" as replacement
                        
                        Example changes array:
                        - Adding to empty document: [{"original": "!ADD_TO_END!", "replacement": "This is the new content the user requested."}]
                        - Replacing text: [{"original": "The quick brown fox", "replacement": "The swift red fox"}]
                        - Multiple changes: [{"original": "old sentence 1", "replacement": "new sentence 1"}, {"original": "old sentence 2", "replacement": "new sentence 2"}]
                        - Appending: [{"original": "!ADD_TO_END!", "replacement": "\\n\\nThis is new content at the end."}]

                        Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      `;

                      const changeMapMessages = [
                        {
                          role: "system",
                          content: changeMapPrompt,
                        },
                        ...uiMessages,
                      ];
                      
                      return await generateObject({
                        model: selectedModelProvider,
                        messages: changeMapMessages,
                        schema: changeMapSchema,
                      });
                    })();
                  }
                }
                
                // No markdown stripping for assistant messages
                cleanedAssistantFullText = assistantFullText;
                
                // Clear searching status if still set (happens when tool was called but no text generated)
                if (isSearching) {
                  isSearching = false;
                  sendEvent("status", { message: "generating", isSearching: false });
                }
                
                // If no assistant text was generated but search was used, create a minimal message
                if (!cleanedAssistantFullText || cleanedAssistantFullText.trim().length === 0) {
                  if (searchWasUsed && collectedSearchText) {
                    cleanedAssistantFullText = "I've searched for current information and will apply the relevant updates to your document.";
                    // Send this as a delta so it appears in the chat
                    sendEvent("assistant-delta", { delta: cleanedAssistantFullText });
                  }
                }
                
            sendEvent("assistant-complete", { text: cleanedAssistantFullText });
                
              } catch (error) {
                throw error;
              }
            })();

            // Wait for assistant stream to complete
            await assistantStreamPromise;

            // If web search was used, ensure results are collected before generating change map
            if (webSearchTool && searchWasUsed && !collectedSearchText) {
              let attempts = 0;
              while (!collectedSearchText && attempts < 15) {
                await new Promise(resolve => setTimeout(resolve, 200));
                attempts++;
              }
            }

            // Now wait for change map generation (which may have already started or completed)
            let changeMapResult;
            if (changeMapPromise) {
              // If we started it early, wait for it now
              changeMapResult = await changeMapPromise;
            } else {
              // If we didn't start it early (web search was used or stream was very short), start it now
              const changeMapPrompt = `
                You are an AI writing assistant that generates precise text edit instructions. A user is working on a document and has requested changes.

                Here is the context for what the user is writing (will be empty if the user has not written anything yet):
                BEGINNING OF CONTEXT
                ${context}
                END OF CONTEXT

                ${images && images.length > 0 ? "The user has also provided images for you to analyze. Use the visual information from the images to understand what content they want to add or how they want to modify their text based on the images." : ""}

                ${collectedSearchText ? `The assistant has run a web search with the query "${collectedQuery ?? ''}" and obtained the following findings. Base your changes on these findings when relevant, and ensure factual accuracy:\n\nBEGIN WEB FINDINGS\n${collectedSearchText}\nEND WEB FINDINGS` : ''}

                Your job is to analyze the current text and the user's request, then generate an array of changes.
                
                Each change has an "original" field (the text to replace) and a "replacement" field (the new text).
                
                Rules for generating changes:
                1. If the user's document is empty and they want you to create new content, use "!ADD_TO_END!" as the original and the new content as the replacement
                2. If you need to append new content to the end of existing text, use "!ADD_TO_END!" as the original and the content to append as the replacement
                3. For edits/replacements, use the EXACT original text snippet as the original, and the replacement text as the replacement
                4. Choose text snippets that are unique enough to be found in the document (include enough context)
                5. If replacing multiple separate sections, create multiple change objects in the array
                6. Keep the snippets focused on what actually needs to change - don't include large unchanged portions
                7. If the user asks you to delete something, use the original text as original and an empty string "" as replacement
                
                Example changes array:
                - Adding to empty document: [{"original": "!ADD_TO_END!", "replacement": "This is the new content the user requested."}]
                - Replacing text: [{"original": "The quick brown fox", "replacement": "The swift red fox"}]
                - Multiple changes: [{"original": "old sentence 1", "replacement": "new sentence 1"}, {"original": "old sentence 2", "replacement": "new sentence 2"}]
                - Appending: [{"original": "!ADD_TO_END!", "replacement": "\\n\\nThis is new content at the end."}]

                Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              `;

              const changeMapMessages = [
                {
                  role: "system",
                  content: changeMapPrompt,
                },
                ...uiMessages,
              ];
              changeMapResult = await generateObject({
                model: selectedModelProvider,
                messages: changeMapMessages,
                schema: changeMapSchema,
              });
            }
            
            const changesArray = changeMapResult.object.changes;
            const changeMap: Record<string, string> = {};
            for (const change of changesArray) {
              // Strip markdown from replacement text (this is what gets applied to the document)
              const cleanedReplacement = stripMarkdown(change.replacement);
              changeMap[change.original] = cleanedReplacement;
            }
            
            sendEvent("changes-final", { changes: changeMap });

            // Update conversation history with the assistant's response
            const updatedHistory = [
              ...history,
              { role: "user", parts: userPrompt },
              { role: "model", parts: cleanedAssistantFullText },
            ];

            // Update context
            sendEvent("status", { message: "Updating context..." });
            
            let contextUpdateResult;
            try {
              contextUpdateResult = await contextUpdate(
                updatedHistory,
                documentId
              );
            } catch (error) {
              
              contextUpdateResult = {
                contextUpdated: false,
                contextChange: null,
              };
            }
            

            // Track premium usage if search was used
            if (searchWasUsed && userId) {
              const usageResult = await trackPremiumUsage(userId);
              remainingUses = usageResult.remainingUses;
            }

            sendEvent("result", {
              result: [cleanedAssistantFullText, {}],
              history: updatedHistory,
              remainingUses,
              searchUsed: searchWasUsed,
              searchQuery: collectedQuery,
              searchSources: collectedSources,
              contextUpdated: contextUpdateResult.contextUpdated,
              contextChange: contextUpdateResult.contextChange,
              actionMode: "edit",
            });
            

            sendEvent("complete", { message: "Processing complete" });
            
          } catch (error) {
            
            sendEvent("error", {
              error: "Failed to generate content",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
  } catch (error) {
    
    return new Response(
      JSON.stringify({ error: "Failed to start streaming" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}