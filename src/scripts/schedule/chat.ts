import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function updateScheduleContext(userId: string, newContext: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { scheduleContext: newContext },
    });
  } catch (error) {
    console.error("Error updating schedule context:", error);
  }
}

async function getCalendarEvents(
  userId: string,
  startDate: string,
  endDate: string,
  timezone?: string
) {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.error("Invalid date format provided.");
      return { error: "Invalid date format. Please use ISO 8601 format." };
    }

    // Convert user's local date to proper UTC boundaries
    // If timezone is provided, use it to set proper day boundaries
    let startUTC: Date;
    let endUTC: Date;

    startUTC = new Date(`${startDate}T00:00:00.000Z`);
    endUTC = new Date(`${endDate}T23:59:59.999Z`);

    const events = await prisma.event.findMany({
      where: {
        userId,
        start: {
          lte: endUTC,
        },
        end: {
          gte: startUTC,
        },
      },
      select: { title: true, start: true, end: true },
    });

    return events;
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    return { error: "Failed to fetch calendar events." };
  }
}

export async function scheduleChat(
  instructions: string,
  history: any[],
  userId?: string,
  timezone?: string
) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  let context = "";
  let goals: { title: string; type: string }[] = [];
  let events: { title: string; start: Date; end: Date }[] = [];
  let recentNotes: { title: string; content: string }[] = [];

  // Calculate dates in user's timezone
  const now = new Date();
  const userNow = new Date(
    now.toLocaleString("en-US", { timeZone: timezone || "UTC" })
  );
  const yesterdayInUserTz = new Date(userNow);
  yesterdayInUserTz.setDate(yesterdayInUserTz.getDate() - 1);
  const tomorrowInUserTz = new Date(userNow);
  tomorrowInUserTz.setDate(tomorrowInUserTz.getDate() + 1);

  // Store original context for before/after comparison
  let originalContext = "";

  if (userId && timezone) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { scheduleContext: true },
      });
      if (user && user.scheduleContext) {
        context = user.scheduleContext;
        originalContext = user.scheduleContext;
      }
      goals = await prisma.goal.findMany({
        where: {
          userId,
        },
        select: { title: true, type: true },
      });

      const startOfDay = new Date(userNow);
      startOfDay.setHours(0, 0, 0, 0);

      events = await prisma.event.findMany({
        where: {
          userId,
          start: {
            gte: startOfDay,
          },
        },
        select: { title: true, start: true, end: true },
      });

      // Get user's 5 most recent notes from bulletin
      recentNotes = await prisma.bulletin.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { title: true, content: true },
      });
    } catch (e) {
      console.error("Could not find user to get schedule context");
    }
  }

  const systemPrompt = `
You are an AI life assistant helping a user manage their schedule and providing helpful advice to the user.
Current date: ${new Date().toISOString()}.

User goals:
${goals.map((goal) => `- ${goal.title} (${goal.type} goal)`).join("\n")}

Today's remaining events:
${events
  .map((event) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
      timeZone: timezone,
    };
    const start = new Date(event.start).toLocaleTimeString("en-US", options);
    const end = new Date(event.end).toLocaleTimeString("en-US", options);
    return `- ${event.title}: ${start} - ${end}`;
  })
  .join("\n")}

Recent notes from the user's bulletin:
${recentNotes
  .map((note) => `- ${note.title}: ${note.content.substring(0, 200)}${note.content.length > 200 ? "..." : ""}`)
  .join("\n")}

FUNCTION CALLING RULES:
- If user mentions "yesterday" → call get_calendar_events with startDate and endDate both set to ${
    yesterdayInUserTz.toISOString().split("T")[0]
  }
- If user mentions "tomorrow" → call get_calendar_events with tomorrow's date  
- If user mentions any specific date → call get_calendar_events with that date
- DO NOT say "I need to retrieve" - just call the function immediately

Today: ${userNow.toISOString().split("T")[0]}
Yesterday: ${yesterdayInUserTz.toISOString().split("T")[0]}

User context: ${context}

CONTEXT UPDATE RULES:
The user context is general information about the user's life that has been accumulated over time.
It is used to help the AI understand the user's life and provide better advice.
It is updated automatically by the AI when the user shares information that should be saved to their context.

You must automatically detect when the user shares information that should be saved to their context. Look for:
- Daily routines, habits, or patterns (wake up time, work hours, meal times, etc.)
- Scheduling preferences (preferred meeting times, break preferences, etc.)
- Personal constraints (commute time, family obligations, etc.)
- Work patterns (focus time preferences, meeting preferences, etc.)
- Location information (work from home days, office location, etc.)
- Health or wellness routines (exercise time, sleep schedule, etc.)
- Goals (work goals, personal goals, etc.)

CRITICAL: When updating context, make INCREMENTAL changes only:
- Always preserve all the information contained in the original context
- If the existing context already contains related information, modify or add to it rather than replacing it
- Preserve all existing context unless it directly contradicts new information
- Add new information by appending or integrating it with existing content
- Only replace specific pieces of information that are being updated

CRITICAL: You MUST ALWAYS respond with valid JSON format. Never respond with plain text.

WORKFLOW:
1. If user asks about non-today dates: First call get_calendar_events function
2. After getting function results: Return JSON response with the information
3. If no function call needed: Return JSON response directly

REQUIRED JSON FORMAT (this is mandatory - never deviate from this format):
{
  "response": "your conversational response to the user. Whenever you mention times use 12 hour format",
  "contextUpdate": null or "incrementally updated context preserving existing information"
}

EXAMPLES OF CORRECT RESPONSES:
{
  "response": "I see you have a meeting at 2:00 PM today. That sounds important!",
  "contextUpdate": null
}

{
  "response": "I'll remember that you prefer morning workouts. That's great for starting your day energized!",
  "contextUpdate": "User preferences: Prefers morning workouts around 7:00 AM to start the day energized."
}

IMPORTANT: 
- Always wrap your response in the JSON structure above
- Use proper JSON syntax with double quotes
- Escape any quotes within strings
- Never include markdown code blocks or additional text outside the JSON
`;

  const userPrompt = instructions;

  const genAI = new GoogleGenerativeAI(geminiKey);

  const tools = [
    {
      functionDeclarations: [
        {
          name: "get_calendar_events",
          description:
            "Get calendar events for a specific date or date range. Use this when user asks about their schedule for any day other than today.",
          parameters: {
            type: "object",
            properties: {
              startDate: {
                type: "string",
                description: "Start date in ISO 8601 format (YYYY-MM-DD)",
              },
              endDate: {
                type: "string",
                description: "End date in ISO 8601 format (YYYY-MM-DD)",
              },
            },
            required: ["startDate", "endDate"],
          },
        },
      ],
    },
  ];

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
    tools: tools,
  });

  const formattedHistory = history.map(
    (entry: { role: string; content: string }) => ({
      role: entry.role,
      parts: [{ text: entry.content }],
    })
  );

  const chatSession = model.startChat({
    history: formattedHistory,
    generationConfig: {
      temperature: 0, // Make responses more deterministic
      candidateCount: 1,
      maxOutputTokens: 2048,
      topP: 0.1,
      topK: 1,
    },
  });

  let result = await chatSession.sendMessage(userPrompt);

  // Track tool calls for UI display
  const toolCallsExecuted: Array<{
    name: string;
    description: string;
  }> = [];

  let _continue = true;
  while (_continue) {
    const toolCalls = result.response.functionCalls();

    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const { name, args } = toolCall;
      if (name === "get_calendar_events" && userId) {
        const { startDate, endDate } = args;
        const toolResult = await getCalendarEvents(
          userId,
          startDate,
          endDate,
          timezone
        );

        // Track this tool call for UI display
        // Use the user's timezone for proper date formatting
        const startDateFormatted = new Date(
          startDate + "T12:00:00"
        ).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          timeZone: timezone,
        });
        const endDateFormatted = new Date(
          endDate + "T12:00:00"
        ).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          timeZone: timezone,
        });

        let description = `Read events from ${startDateFormatted}`;
        if (startDate !== endDate) {
          description = `Read events from ${startDateFormatted} - ${endDateFormatted}`;
        }

        toolCallsExecuted.push({
          name: "get_calendar_events",
          description,
        });

        // Check if result has an error property
        if (
          toolResult &&
          typeof toolResult === "object" &&
          "error" in toolResult
        ) {
          console.error("Error in get_calendar_events:", toolResult.error);
        }

        // Send the function response back to the model
        const functionResponseMessage = `Function ${name} returned: ${JSON.stringify(
          toolResult
        )}`;
        result = await chatSession.sendMessage(functionResponseMessage);
      } else {
        _continue = false;
      }
    } else {
      _continue = false;
    }
  }

  const responseText = result.response.text();

  if (!responseText || responseText.trim() === "") {
    console.error("Empty response text received");
    return {
      response: "I apologize, but I couldn't process your request properly.",
      contextUpdated: false,
    };
  }

  let response;
  try {
    // Strip markdown code blocks if present
    let cleanedResponseText = responseText
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    // If the response doesn't start with '{', try to extract JSON from the text
    if (!cleanedResponseText.startsWith("{")) {
      const jsonMatch = cleanedResponseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponseText = jsonMatch[0];
      } else {
        // If no JSON found, create a fallback response
        console.warn("No JSON found in response, creating fallback");
        cleanedResponseText = JSON.stringify({
          response:
            cleanedResponseText ||
            "I apologize, but I encountered an error processing your request.",
          contextUpdate: null,
        });
      }
    }

    response = JSON.parse(cleanedResponseText);

    // Validate the response structure
    if (!response.response || typeof response.response !== "string") {
      throw new Error(
        "Invalid response structure - missing or invalid 'response' field"
      );
    }
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    console.error("Original response text:", responseText);

    // Create a safe fallback response
    response = {
      response:
        "I apologize, but I encountered an error processing your request. Please try again.",
      contextUpdate: null,
    };
  }

  const shouldUpdateContext = response.contextUpdate && userId;

  if (shouldUpdateContext) {
    await updateScheduleContext(userId, response.contextUpdate);
  }

  return {
    response: response.response,
    contextUpdated: !!shouldUpdateContext,
    toolCalls: toolCallsExecuted,
    contextChange: shouldUpdateContext
      ? {
          before: originalContext || "",
          after: response.contextUpdate,
        }
      : undefined,
  };
}
