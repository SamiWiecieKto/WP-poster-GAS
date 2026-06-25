import { GoogleGenAI, Type } from '@google/genai';
import { WPCategory } from './wp-api';

// Instantiate lazily: the SDK throws if no key is set, so doing this at module
// load would crash the whole app on import. Defer it until a file is processed.
let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set. Add it to .env.local and restart.');
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

export async function analyzeContent(html: string, categories: WPCategory[]): Promise<{ categoryId: number, imagePrompt: string }> {
  const categoriesList = categories.map(c => `${c.id}: ${c.name}`).join('\n');

  // Truncate the body to keep the prompt within token limits.
  const body = html.substring(0, 5000);

  const prompt = `
You are an expert blog editor. Analyze the following blog post content (provided in HTML).
Based on the content:
1. Select the most appropriate category ID from the provided list. If none fit perfectly, pick the closest one.
2. Create a detailed prompt for an AI image generator to create a featured image for this blog post. The prompt should describe a high-quality, engaging, and relevant image without any text in it.

Available Categories:
${categoriesList}

Blog Post Content:
${body}
  `;

  const response = await ai().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          categoryId: {
            type: Type.INTEGER,
            description: "The ID of the selected category"
          },
          imagePrompt: {
            type: Type.STRING,
            description: "The prompt for the image generator"
          }
        },
        required: ["categoryId", "imagePrompt"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Failed to generate analysis");
  
  const result = JSON.parse(text);
  
  // Validate category ID exists, fallback to first if not
  const categoryExists = categories.some(c => c.id === result.categoryId);
  if (!categoryExists && categories.length > 0) {
    result.categoryId = categories[0].id;
  }

  return result;
}

export async function generateImage(prompt: string): Promise<string> {
  const response = await ai().models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: prompt,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "16:9",
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      const base64EncodeString: string = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64EncodeString}`;
    }
  }

  throw new Error("Failed to generate image");
}
