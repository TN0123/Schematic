export async function pdfUpload(arrayBuffer: ArrayBuffer) {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  require("dotenv").config();

  const geminiKey = process.env.GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(geminiKey!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const filePart = {
    inlineData: {
      mimeType: "application/pdf",
      data: Buffer.from(arrayBuffer).toString("base64"),
    },
  };

  const prompt = {
    contents: [
      {
        role: "user",
        parts: [filePart, { text: "Summarize what is in this pdf" }],
      },
    ],
  };

  const result = await model.generateContent(prompt);
  return await result.response.text();
}
