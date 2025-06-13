export async function generateDynamicSchema(description: string) {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  require("dotenv").config();
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) {
    throw new Error("Gemini API key not configured");
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
- "table": Interactive editable table with configurable dimensions (include rows and cols in config)

Rules:
1. Always return valid JSON with no additional text or formatting
2. Create 3-8 components maximum for good UX
3. Use clear, descriptive labels
4. Add helpful placeholders where appropriate
5. Generate a concise but descriptive title for the note
6. Use semantic component IDs (e.g., "task-list", "meeting-date", "notes")
7. Consider the logical flow and grouping of information
8. For table components, ALWAYS include a "config" object with "rows" and "cols" properties
9. When users request tables, ensure they are properly sized (minimum 2x2, maximum 10x10)
10. Table components should have descriptive labels indicating they are editable

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
  try {
    // Clean the response in case there's any markdown formatting
    const cleanedResponse = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    const parsedResponse = JSON.parse(cleanedResponse);

    // Validate the response structure
    if (
      !parsedResponse.title ||
      !parsedResponse.schema ||
      !parsedResponse.schema.components
    ) {
      throw new Error("Invalid schema structure generated");
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
    ];
    const components = parsedResponse.schema.components;

    if (!Array.isArray(components) || components.length === 0) {
      throw new Error("No valid components generated");
    }

    // Validate each component
    for (const component of components) {
      if (!component.id || !component.type || !component.label) {
        throw new Error("Invalid component structure");
      }

      if (!validComponentTypes.includes(component.type)) {
        throw new Error(`Invalid component type: ${component.type}`);
      }

      // Validate table components have proper config
      if (component.type === "table") {
        if (
          !component.config ||
          !component.config.rows ||
          !component.config.cols
        ) {
          throw new Error(
            "Table components must have config with rows and cols"
          );
        }

        if (
          typeof component.config.rows !== "number" ||
          typeof component.config.cols !== "number"
        ) {
          throw new Error("Table rows and cols must be numbers");
        }

        if (
          component.config.rows < 2 ||
          component.config.cols < 2 ||
          component.config.rows > 10 ||
          component.config.cols > 10
        ) {
          throw new Error("Table dimensions must be between 2x2 and 10x10");
        }
      }
    }

    return {
      title: parsedResponse.title,
      schema: parsedResponse.schema,
    };
  } catch (parseError) {
    console.error("Failed to parse Gemini response:", responseText);
    throw new Error("Failed to generate valid schema");
  }
}
