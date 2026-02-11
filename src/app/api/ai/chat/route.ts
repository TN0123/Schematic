import { getServerSession } from "next-auth";
import authOptions from "@/lib/auth";
import { scheduleChat } from "@/scripts/schedule/chat";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const {
      instructions,
      history = [],
      userId,
      timezone,
      goalsView,
    } = await req.json();

    if (!instructions || !userId || !timezone) {
      return new Response(
        JSON.stringify({ error: "Missing instructions, userId, or timezone" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Ensure the user is only chatting as themselves
    if (userId !== session.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const onToolCall = (toolCall: {
            name: string;
            description: string;
            notes?: Array<{ id: string; title: string; type?: string }>;
          }) => {
            const data = JSON.stringify({ type: "toolCall", toolCall });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          };

          const { response, contextUpdated, toolCalls } = await scheduleChat(
            instructions,
            history,
            userId,
            timezone,
            goalsView,
            onToolCall
          );

          const doneData = JSON.stringify({
            type: "done",
            response,
            contextUpdated,
            toolCalls,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Error in schedule chat streaming:", error);
          const errorData = JSON.stringify({
            type: "error",
            error: "Failed to get response from AI",
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in schedule chat API:", error);
    return new Response(JSON.stringify({ error: "Failed to get response from AI" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
