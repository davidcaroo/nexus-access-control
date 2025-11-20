import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GeminiAnalysisResult } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeIDCard = async (base64Image: string): Promise<GeminiAnalysisResult> => {
  try {
    const client = getClient();
    // Using the specific requested model
    const modelId = "gemini-3-pro-preview"; 
    
    // Clean base64 string if it has the prefix
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");

    const prompt = `
      Analiza esta imagen. Parece ser una identificación personal o una foto de un empleado.
      
      Si es un documento de identidad (Cédula, DNI, Pasaporte):
      1. Extrae el nombre completo.
      2. Extrae el número de identificación (cédula).
      
      Si es una persona:
      1. Describe brevemente a la persona para propósitos de registro de seguridad.
      
      Devuelve la respuesta estrictamente en formato JSON con la siguiente estructura:
      {
        "nombre": "string o null",
        "cedula": "string o null",
        "description": "string"
      }
      No incluyas bloques de código markdown, solo el JSON crudo.
    `;

    const response: GenerateContentResponse = await client.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    // Sanitize and parse JSON
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonStr);

    return {
      nombre: data.nombre || undefined,
      cedula: data.cedula || undefined,
      description: data.description
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};