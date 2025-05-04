export async function imageUpload(arrayBuffer: ArrayBuffer, mimeType: string) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  require("dotenv").config();

  const geminiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(geminiKey!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const currentDate = new Date().toISOString().split("T")[0];

  const filePart = {
    inlineData: {
      mimeType: mimeType,
      data: Buffer.from(arrayBuffer).toString("base64"),
    },
  };

  const promptText = `
      You are a helpful assistant helping a user extract information from an image and turning it into
      events that can be added to their calendar. You will be provided with an image and your task is to
      extract things that can be turned into calendar events and return them as an array of GeneratedEvent objects.
  
      The current date is ${currentDate}.
  
      You must return an array of Event objects.
      **Output Format (JSON array only, no extra text):**
        [
          {
            "id": "unique-string",
            "title": "Event Title",
            "start": "ISO8601 DateTime",
            "end": "ISO8601 DateTime"
          }
        ]
  
      The image file has been provided to you, generate the events from it. If you cannot find any events, return an empty array.
      Respond with only the array of events, nothing else. Double check to make sure the ids are unique.
    `;

  const prompt = {
    contents: [
      {
        role: "user",
        parts: [filePart, { text: promptText }],
      },
    ],
  };

  const result = await model.generateContent(prompt);
  return await result.response.text();
}
