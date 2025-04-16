import axios from 'axios';
import { GoogleGenAI, Modality } from "@google/genai";
// Types for sticky note and function call
export interface StickyNote {
  id: string;
  content: string;
  color: string;
}

export interface GeminiFunctionCall {
  function: string;
  arguments: Record<string, any>;
}

// Gemini API chat with function calling for sticky notes
type GeminiChatRequest = {
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  tools?: Array<{
    functionDeclarations: Array<{
      name: string;
      description?: string;
      parameters: Record<string, any>;
    }>;
  }>;
  toolConfig?: {
    functionCallingConfig?: {
      allowedFunctions?: string[];
      mode?: 'AUTO' | 'ENABLED' | 'DISABLED';
    };
  };
};

type GeminiChatResponse = {
  stickyNotes: StickyNote[];
};

type GeminiAPIResponse = {
  candidates: Array<{
    content: {
      parts: Array<{
        functionCall?: {
          name: string;
          args: Record<string, any>;
        };
        text?: string;
      }>;
    };
  }>;
};

// Types for image generation
interface ImageGenerationOptions {
  prompt: string;
  width?: number;
  height?: number;
  numberOfImages?: number;
}

interface GeneratedImage {
  imageUrl?: string;
  base64Data?: string;
}

interface ImageGenerationResponse {
  images: GeneratedImage[];
  promptId?: string;
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_IMAGE_MODEL = 'imagen-3.0-generate-002';

// Fix: Extract just the API key rather than using the full URL as a key
// Using a correct API key format
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ;


// Function to create a single sticky note
export function createStickyNote(content: string = 'TEXT HERE', color: string = 'white'): StickyNote {
  return {
    id: Math.random().toString(36).substr(2, 9),
    content,
    color,
  };
}

// Function to return a list of sticky notes based on user input
export function getStickyNotes(count: number, content?: string, color: string = 'white'): StickyNote[] {
  const notes: StickyNote[] = [];
  for (let i = 0; i < count; i++) {
    notes.push(createStickyNote(content || 'TEXT HERE', color));
  }
  return notes;
}

// Main function to interact with Gemini API and handle sticky note creation
export async function geminiChatWithStickyNotes(
  userMessage: string,
  stickyNoteCount: number,
  content?: string,
  color: string = 'white'
): Promise<GeminiChatResponse> {
  try {
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key is not defined');
      throw new Error('API key not configured');
    }

    // Define the function schema for creating sticky notes
    const createStickyNotesSchema = {
      name: "createStickyNotes",
      description: "Creates a specified number of sticky notes with optional content and color",
      parameters: {
        type: "object",
        properties: {
          count: {
            type: "integer",
            description: "Number of sticky notes to create"
          },
          content: {
            type: "string",
            description: "Content text for the sticky notes"
          },
          color: {
            type: "string",
            description: "Color of the sticky notes"
          }
        },
        required: ["count"]
      }
    };

    // Prepare the request body according to Gemini API specs
    const requestBody: GeminiChatRequest = {
      contents: [
        { 
          role: 'user', 
          parts: [{ text: userMessage }] 
        }
      ],
      tools: [
        {
          functionDeclarations: [createStickyNotesSchema]
        }
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: "ENABLED",
          allowedFunctions: ["createStickyNotes"]
        }
      }
    };

    // Call Gemini API - either directly or through proxy
    let url, requestConfig;
    
    url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
      requestConfig = {
        headers: {
          'Content-Type': 'application/json',
        }
      };
    
    const response = await axios.post<GeminiAPIResponse>(url, requestBody, requestConfig);

    // Parse response to extract function call
    const functionCall = response.data.candidates?.[0]?.content?.parts?.find(
      part => part.functionCall
    )?.functionCall;

    if (functionCall && functionCall.name === 'createStickyNotes') {
      const args = functionCall.args;
      const count = args.count || stickyNoteCount;
      const noteContent = args.content || content || 'TEXT HERE';
      const noteColor = args.color || color;

      // Generate sticky notes from the function call response
      return {
        stickyNotes: getStickyNotes(count, noteContent, noteColor)
      };
    } else {
      // Fallback to default values if function call is not present
      return {
        stickyNotes: getStickyNotes(stickyNoteCount, content, color)
      };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    
    // Return fallback sticky notes in case of error
    return {
      stickyNotes: getStickyNotes(stickyNoteCount, content, color)
    };
  }
}

// Gemini image generation function with GoogleGenAI SDK
export async function geminiGenerateImage(
  prompt?: string
): Promise<ImageGenerationResponse> {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const contents = prompt || 
      "Hi, can you create a 3d rendered image of a pig " +
      "with wings and a top hat flying over a happy " +
      "futuristic scifi city with lots of greenery?";
  
    // Set responseModalities to include "Image" so the model can generate an image
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp-image-generation",
      contents: contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });
    
    if (!response || !response.candidates || response.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }
    
    // Process the response to extract image data
    const images: GeneratedImage[] = [];
    
    // Extract base64 image data from the response with proper null checks
    for (const candidate of response.candidates) {
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            images.push({
              base64Data: part.inlineData.data,
              imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            });
          }
        }
      }
    }
    
    return {
      images,
      promptId: Math.random().toString(36).substring(2, 15)
    };
  } catch (error) {
    console.error('Error in geminiGenerateImage:', error);
    return {
      images: [] // Return empty array in case of error
    };
  }
}