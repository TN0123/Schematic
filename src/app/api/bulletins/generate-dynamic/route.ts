import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { description } = await request.json();

    if (!description || typeof description !== "string") {
      return new NextResponse("Description is required", { status: 400 });
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require("dotenv").config();
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return new NextResponse("Gemini API key not configured", { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
You are an expert UI designer that creates structured note schemas based on user descriptions. 
Your task is to convert a user's description into a JSON schema that defines dynamic form components.

Available component types:
- "title": A large header input field (use sparingly, usually just one)
- "text": Single-line text input with a label
- "textarea": Multi-line text input for longer content
- "number": Numeric input field
- "date": Date picker input
- "checklist": Interactive todo-style list with checkboxes
- "table": Interactive table with editable cells (include rows and cols in config)
- "graph": Interactive knowledge graph for connecting concepts and ideas
- "tree": Hierarchical tree structure for organizing information
- "flowchart": Process flowchart for documenting workflows
- "mindmap": Interactive mind map for brainstorming and visual thinking

Rules:
1. Always return valid JSON with no additional text or formatting
2. Create 3-8 components maximum for good UX
3. Use clear, descriptive labels
4. Add helpful placeholders where appropriate
5. Generate a concise but descriptive title for the note
6. Use semantic component IDs (e.g., "task-list", "meeting-date", "notes")
7. Consider the logical flow and grouping of information
8. For table components, ALWAYS include a "config" object with "rows" and "cols" properties

User description: "${description}"

Return a JSON object with this exact structure:
{
  "title": "Generated Note Title",
  "schema": {
    "components": [
      {
        "id": "component-id",
        "type": "component-type",
        "label": "Component Label",
        "placeholder": "Optional placeholder text",
        "config": { "rows": 4, "cols": 4 }
      }
    ]
  }
}

Note: Only include the "config" property for table components. For table components, determine appropriate rows and cols based on the user's request.

Generate the schema now:`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON response
    let parsedResponse;
    try {
      // Clean the response in case there's any markdown formatting
      const cleanedResponse = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", responseText);
      return new NextResponse("Failed to generate valid schema", {
        status: 500,
      });
    }

    // Validate the response structure
    if (
      !parsedResponse.title ||
      !parsedResponse.schema ||
      !parsedResponse.schema.components
    ) {
      return new NextResponse("Invalid schema structure generated", {
        status: 500,
      });
    }

    // Validate component structure
    const validComponentTypes = [
      "title",
      "text",
      "textarea",
      "number",
      "date",
      "checklist",
      "table",
      "graph",
      "tree",
      "flowchart",
      "mindmap",
    ];
    const components = parsedResponse.schema.components;

    if (!Array.isArray(components) || components.length === 0) {
      return new NextResponse("No valid components generated", { status: 500 });
    }

    // Validate each component
    for (const component of components) {
      if (!component.id || !component.type || !component.label) {
        return new NextResponse("Invalid component structure", { status: 500 });
      }

      if (!validComponentTypes.includes(component.type)) {
        return new NextResponse(`Invalid component type: ${component.type}`, {
          status: 500,
        });
      }

      // Validate table components have proper config
      if (component.type === "table") {
        if (
          !component.config ||
          !component.config.rows ||
          !component.config.cols
        ) {
          return new NextResponse(
            "Table components must have config with rows and cols",
            { status: 500 }
          );
        }

        if (
          typeof component.config.rows !== "number" ||
          typeof component.config.cols !== "number"
        ) {
          return new NextResponse("Table rows and cols must be numbers", {
            status: 500,
          });
        }

        if (
          component.config.rows < 1 ||
          component.config.cols < 1 ||
          component.config.rows > 20 ||
          component.config.cols > 20
        ) {
          return new NextResponse("Table dimensions must be between 1 and 20", {
            status: 500,
          });
        }
      }
    }

    return NextResponse.json({
      title: parsedResponse.title,
      schema: parsedResponse.schema,
    });
  } catch (error) {
    console.error("Error generating dynamic schema:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
