import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const requestId = `gen-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  if (!session?.user?.email) {
    return NextResponse.json(
      {
        error: {
          message: "Authentication required",
          details: "You must be signed in to generate dynamic notes",
          code: "AUTH_REQUIRED",
          suggestions: ["Please sign in and try again"],
          technicalInfo: {
            endpoint: "/api/bulletins/generate-dynamic",
            requestId,
            timestamp: new Date().toISOString(),
          },
        },
      },
      { status: 401 }
    );
  }

  try {
    const { description } = await request.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        {
          error: {
            message: "Description is required",
            details:
              "Please provide a description of the note format you want to create",
            code: "MISSING_DESCRIPTION",
            suggestions: [
              "Describe what kind of note you want (e.g., 'A workout tracker with exercises and reps')",
              "Be specific about the fields and structure you need",
              "Include any special components like tables, graphs, or checklists",
            ],
            technicalInfo: {
              endpoint: "/api/bulletins/generate-dynamic",
              requestId,
              timestamp: new Date().toISOString(),
            },
          },
        },
        { status: 400 }
      );
    }

    const { GoogleGenerativeAI } = require("@google/generative-ai");
    require("dotenv").config();
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      return NextResponse.json(
        {
          error: {
            message: "AI service unavailable",
            details: "The AI model configuration is missing or invalid",
            code: "AI_CONFIG_ERROR",
            suggestions: [
              "Please try again later",
              "Contact support if the problem persists",
            ],
            technicalInfo: {
              endpoint: "/api/bulletins/generate-dynamic",
              requestId,
              aiModel: "gemini-2.5-flash",
              timestamp: new Date().toISOString(),
            },
          },
        },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
- "button": Interactive button that can perform actions on other components

Layout structure:
- Each row contains an array of component IDs
- Components in the same row will be displayed side-by-side
- Rows are stacked vertically
- You can specify gap size between components (1-8, default 4)
- Layout is responsive and will wrap on smaller screens

Button component structure:
For button components, if you decide to use them, you MUST include a "config" object with an "action" property 
that defines what the button does. Avoid using the description property unless you think it would be significantly
needed.

{
  "id": "button-id",
  "type": "button",
  "label": "Button Text",
  "config": {
    "action": {
      "type": "action-type",
      "targetComponentId": "target-component-id",
      "value": "optional-value",
      "incrementBy": 1,
      "checklistItemText": "optional-text"
    },
    "description": "Optional description of what the button does"
  }
}

Available button action types:
- "table-add-row": Adds a new row to a table. Use "value" array for row data or string for first column
- "table-remove-row": Removes the last row from a table
- "table-add-column": Adds a new column to a table
- "table-remove-column": Removes the last column from a table
- "increment-number": Increases a number field. Use "incrementBy" to specify amount (default: 1)
- "decrement-number": Decreases a number field. Use "incrementBy" to specify amount (default: 1)
- "set-value": Sets a component to a specific value. Use "value" to specify the new value
- "add-checklist-item": Adds a new item to a checklist. Use "checklistItemText" for the item text
- "set-date-today": Sets a date field to today's date
- "clear-component": Clears/resets a component's value

Rules:
1. Always return valid JSON with no additional text or formatting
2. Create 3-8 components maximum for good UX
3. Use clear, descriptive labels
4. Add helpful placeholders where appropriate
5. Generate a concise but descriptive title for the note
6. Use semantic component IDs (e.g., "task-list", "meeting-date", "notes")
7. Consider the logical flow and grouping of information
8. For table components, ALWAYS include a "config" object with "rows" and "cols" properties
9. Create a thoughtful layout that groups related components together
10. Use rows to place complementary components side-by-side (e.g., date and time, name and email)
11. Keep larger components (like tables, graphs, textareas) in their own rows
12. Smaller components (text, number, date) work well side-by-side

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
    ],
    "layout": [
      {
        "id": "row-1",
        "components": ["component-id-1", "component-id-2"],
        "gap": 4
      },
      {
        "id": "row-2", 
        "components": ["component-id-3"]
      }
    ]
  }
}

Note: Only include the "config" property for table and button components. For table components, determine appropriate rows and cols based on the user's request.

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
      return NextResponse.json(
        {
          error: {
            message: "AI generated invalid response",
            details:
              "The AI model returned a response that couldn't be processed",
            code: "AI_PARSE_ERROR",
            suggestions: [
              "Try rephrasing your description",
              "Be more specific about the components you need",
              "Use simpler language in your request",
              "Try again - AI responses can vary",
            ],
            technicalInfo: {
              endpoint: "/api/bulletins/generate-dynamic",
              requestId,
              aiModel: "gemini-2.5-flash",
              timestamp: new Date().toISOString(),
              validationErrors: [
                `Parse error: ${
                  parseError instanceof Error
                    ? parseError.message
                    : "Unknown parsing error"
                }`,
              ],
            },
          },
        },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (
      !parsedResponse.title ||
      !parsedResponse.schema ||
      !parsedResponse.schema.components
    ) {
      const missingFields = [];
      if (!parsedResponse.title) missingFields.push("title");
      if (!parsedResponse.schema) missingFields.push("schema");
      if (!parsedResponse.schema?.components)
        missingFields.push("schema.components");

      return NextResponse.json(
        {
          error: {
            message: "AI generated incomplete response",
            details: `The AI model didn't provide all required fields: ${missingFields.join(
              ", "
            )}`,
            code: "INCOMPLETE_SCHEMA",
            suggestions: [
              "Try describing your note requirements more clearly",
              "Specify the exact fields and components you need",
              "Try again with a different description",
              "Break down complex requests into simpler ones",
            ],
            technicalInfo: {
              endpoint: "/api/bulletins/generate-dynamic",
              requestId,
              aiModel: "gemini-2.5-flash",
              timestamp: new Date().toISOString(),
              validationErrors: [
                `Missing required fields: ${missingFields.join(", ")}`,
              ],
            },
          },
        },
        { status: 500 }
      );
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
      "button",
    ];
    const components = parsedResponse.schema.components;

    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        {
          error: {
            message: "No valid components generated",
            details: "The AI model didn't create any usable form components",
            code: "NO_COMPONENTS",
            suggestions: [
              "Try describing specific components you need (text fields, tables, etc.)",
              "Be more detailed about the structure you want",
              "Provide examples of similar notes",
              "Try a simpler description first",
            ],
            technicalInfo: {
              endpoint: "/api/bulletins/generate-dynamic",
              requestId,
              aiModel: "gemini-2.5-flash",
              timestamp: new Date().toISOString(),
              validationErrors: ["Component array is empty or invalid"],
            },
          },
        },
        { status: 500 }
      );
    }

    // Validate each component
    const validationErrors = [];
    for (const component of components) {
      if (!component.id || !component.type || !component.label) {
        const missing = [];
        if (!component.id) missing.push("id");
        if (!component.type) missing.push("type");
        if (!component.label) missing.push("label");
        validationErrors.push(
          `Component missing required fields: ${missing.join(", ")}`
        );
      }

      if (component.type && !validComponentTypes.includes(component.type)) {
        validationErrors.push(
          `Invalid component type: ${
            component.type
          }. Valid types: ${validComponentTypes.join(", ")}`
        );
      }

      // Validate table components have proper config
      if (component.type === "table") {
        if (
          !component.config ||
          !component.config.rows ||
          !component.config.cols
        ) {
          validationErrors.push(
            `Table component "${component.id}" must have config with rows and cols`
          );
        } else {
          if (
            typeof component.config.rows !== "number" ||
            typeof component.config.cols !== "number"
          ) {
            validationErrors.push(
              `Table component "${component.id}" rows and cols must be numbers`
            );
          }

          if (
            component.config.rows < 1 ||
            component.config.cols < 1 ||
            component.config.rows > 20 ||
            component.config.cols > 20
          ) {
            validationErrors.push(
              `Table component "${component.id}" dimensions must be between 1 and 20`
            );
          }
        }
      }

      // Validate button components have proper action config
      if (component.type === "button") {
        if (!component.config || !component.config.action) {
          validationErrors.push(
            `Button component "${component.id}" must have config with action`
          );
        } else {
          const action = component.config.action;
          const validActionTypes = [
            "table-add-row",
            "table-remove-row",
            "table-add-column",
            "table-remove-column",
            "increment-number",
            "decrement-number",
            "set-value",
            "add-checklist-item",
            "set-date-today",
            "clear-component",
          ];

          if (!validActionTypes.includes(action.type)) {
            validationErrors.push(
              `Button component "${component.id}" has invalid action type: ${
                action.type
              }. Valid types: ${validActionTypes.join(", ")}`
            );
          }

          if (!action.targetComponentId) {
            validationErrors.push(
              `Button component "${component.id}" action must have targetComponentId`
            );
          }
        }
      }
    }

    // Check for validation errors after processing all components
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: {
            message: "Invalid component configuration",
            details: "The AI generated components with validation errors",
            code: "COMPONENT_VALIDATION_ERROR",
            suggestions: [
              "Try simplifying your description",
              "Focus on basic components first (text, textarea, etc.)",
              "Avoid complex button actions initially",
              "Try describing each component separately",
            ],
            technicalInfo: {
              endpoint: "/api/bulletins/generate-dynamic",
              requestId,
              aiModel: "gemini-2.5-flash",
              timestamp: new Date().toISOString(),
              validationErrors,
            },
          },
        },
        { status: 500 }
      );
    }

    // Validate layout structure if present
    if (parsedResponse.schema.layout) {
      const layout = parsedResponse.schema.layout;
      const layoutValidationErrors = [];

      if (!Array.isArray(layout)) {
        layoutValidationErrors.push("Layout must be an array");
      } else {
        const componentIds = new Set(components.map((comp) => comp.id));

        for (const row of layout) {
          if (!row.id || !row.components) {
            const missing = [];
            if (!row.id) missing.push("id");
            if (!row.components) missing.push("components");
            layoutValidationErrors.push(
              `Layout row missing required fields: ${missing.join(", ")}`
            );
          }

          if (row.components && !Array.isArray(row.components)) {
            layoutValidationErrors.push(
              `Layout row "${row.id}" components must be an array`
            );
          }

          // Validate that all component IDs in layout exist
          if (Array.isArray(row.components)) {
            for (const componentId of row.components) {
              if (!componentIds.has(componentId)) {
                layoutValidationErrors.push(
                  `Layout row "${row.id}" references non-existent component: ${componentId}`
                );
              }
            }
          }

          // Validate gap if present
          if (row.gap !== undefined) {
            if (typeof row.gap !== "number" || row.gap < 1 || row.gap > 8) {
              layoutValidationErrors.push(
                `Layout row "${row.id}" gap must be a number between 1 and 8`
              );
            }
          }
        }
      }

      if (layoutValidationErrors.length > 0) {
        return NextResponse.json(
          {
            error: {
              message: "Invalid layout configuration",
              details:
                "The AI generated layout structure has validation errors",
              code: "LAYOUT_VALIDATION_ERROR",
              suggestions: [
                "Try requesting a simpler layout structure",
                "Focus on single-column layout first",
                "Ensure all component references are valid",
                "Try again without specifying custom layout",
              ],
              technicalInfo: {
                endpoint: "/api/bulletins/generate-dynamic",
                requestId,
                aiModel: "gemini-2.5-flash",
                timestamp: new Date().toISOString(),
                validationErrors: layoutValidationErrors,
              },
            },
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      title: parsedResponse.title,
      schema: parsedResponse.schema,
    });
  } catch (error) {
    console.error("Error generating dynamic schema:", error);
    return NextResponse.json(
      {
        error: {
          message: "Internal server error",
          details:
            "An unexpected error occurred while generating the note schema",
          code: "INTERNAL_ERROR",
          suggestions: [
            "Please try again in a few moments",
            "If the problem persists, try a simpler description",
            "Contact support if you continue to experience issues",
          ],
          technicalInfo: {
            endpoint: "/api/bulletins/generate-dynamic",
            requestId,
            aiModel: "gemini-2.5-flash",
            timestamp: new Date().toISOString(),
            validationErrors: [
              error instanceof Error ? error.message : "Unknown error",
            ],
          },
        },
      },
      { status: 500 }
    );
  }
}
