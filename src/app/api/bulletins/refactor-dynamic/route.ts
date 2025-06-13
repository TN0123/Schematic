import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { description, currentTitle, currentSchema, currentData } =
      await request.json();

    if (!description || typeof description !== "string") {
      return new NextResponse("Description is required", { status: 400 });
    }

    if (!currentSchema || !currentSchema.components) {
      return new NextResponse("Current schema is required", { status: 400 });
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require("dotenv").config();
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return new NextResponse("Gemini API key not configured", { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Prepare current structure info for the AI
    const currentStructureInfo = {
      title: currentTitle,
      components: currentSchema.components.map((comp: any) => ({
        id: comp.id,
        type: comp.type,
        label: comp.label,
        hasData:
          currentData &&
          currentData[comp.id] !== undefined &&
          currentData[comp.id] !== "",
      })),
    };

    const prompt = `
You are an expert UI designer that refactors structured note schemas while preserving existing data.

Your task is to:
1. Generate a new schema based on the refactor description
2. Create a data mapping strategy to preserve existing information
3. Return both the new schema and mapped data

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

Current Note Structure:
${JSON.stringify(currentStructureInfo, null, 2)}

Current Data:
${JSON.stringify(currentData, null, 2)}

Refactor Request: "${description}"

Rules:
1. Always return valid JSON with no additional text or formatting
2. Create 3-8 components maximum for good UX
3. Use clear, descriptive labels
4. Preserve as much existing data as possible by mapping it to appropriate new components
5. Generate a new title that reflects the refactored structure
6. Use semantic component IDs
7. For table components, ALWAYS include a "config" object with "rows" and "cols" properties
8. When mapping data, consider logical transformations (e.g., text can become checklist items, tables can be restructured)
9. If data cannot be preserved in the new structure, include it in a "notes" or "additional-info" component

Return a JSON object with this exact structure:
{
  "title": "New Note Title",
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
  },
  "mappedData": {
    "component-id": "mapped data value"
  },
  "dataMapping": [
    {
      "from": "old-component-id",
      "to": "new-component-id",
      "transformation": "description of how data was transformed"
    }
  ]
}

Note: 
- Only include the "config" property for table components
- The mappedData object should contain values for the new component IDs
- The dataMapping array should explain how old data was transformed to fit new structure
- Be creative but logical in data transformations

Generate the refactored schema and data mapping now:`;

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
      return new NextResponse("Failed to generate valid refactored schema", {
        status: 500,
      });
    }

    // Validate the response structure
    if (
      !parsedResponse.title ||
      !parsedResponse.schema ||
      !parsedResponse.schema.components ||
      !parsedResponse.mappedData
    ) {
      return new NextResponse("Invalid refactored schema structure generated", {
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
      mappedData: parsedResponse.mappedData,
      dataMapping: parsedResponse.dataMapping || [],
    });
  } catch (error) {
    console.error("Error refactoring dynamic schema:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
