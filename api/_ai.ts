import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please add this variable to your Vercel Environment Variables in your project dashboard.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

export async function generateContentWithFallback(params: any) {
  const ai = getAI();
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    console.warn(`Primary model ${params.model} failed, trying fallback model. Error:`, error);
    
    // Fallback 1: gemini-flash-latest
    try {
      const fallbackParams = { ...params, model: "gemini-flash-latest" };
      return await ai.models.generateContent(fallbackParams);
    } catch (fallbackError: any) {
      console.warn(`Fallback model gemini-flash-latest failed, trying second fallback. Error:`, fallbackError);
      
      // Fallback 2: gemini-3.1-flash-lite
      try {
        const fallbackParams2 = { ...params, model: "gemini-3.1-flash-lite" };
        return await ai.models.generateContent(fallbackParams2);
      } catch (finalError: any) {
        console.error("All fallback models failed.", finalError);
        throw finalError;
      }
    }
  }
}
