import axios from "axios";
import { GoogleGenAI, Modality, Type } from "@google/genai";
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

// Chat history message type
export interface ChatMessage {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

// Gemini API chat with function calling for sticky notes
type GeminiChatRequest = {
  contents: Array<ChatMessage>;
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
      mode?: "AUTO" | "ENABLED" | "DISABLED";
    };
  };
};

type GeminiChatResponse = {
  stickyNotes: StickyNote[];
  responseText?: string;
  hasFunctionCall: boolean;
  history: ChatMessage[]; // Adding history to the response
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

const GEMINI_IMAGE_MODEL = "imagen-3.0-generate-002";

// Fix: Extract just the API key rather than using the full URL as a key
// Using a correct API key format
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

// Color mapping between simple names and tailwind classes
type ColorNameToClassMap = {
  [key: string]: string;
};

const colorNameToClassMap: ColorNameToClassMap = {
  blue: "bg-blue-500",
  red: "bg-red-500",
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  teal: "bg-teal-500",
  indigo: "bg-indigo-500",
  gray: "bg-gray-500",
  orange: "bg-orange-500",
  lime: "bg-lime-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
  fuchsia: "bg-fuchsia-500",
  zinc: "bg-zinc-500",
  neutral: "bg-neutral-500",
  slate: "bg-slate-500",
  stone: "bg-stone-500",
  amber: "bg-amber-500",
  black: "bg-black",
  white: "bg-white",
};
const getColorClass = (colorInput: string): string => {
  if (colorInput.startsWith("bg-")) {
    return colorInput;
  }

  const normalizedColor = colorInput.toLowerCase();
  return colorNameToClassMap[normalizedColor] || colorNameToClassMap["yellow"];
};
// Function to create a single sticky note
export function createStickyNote(
  content: string = "TEXT HERE",
  color: string = "yellow"
): StickyNote {
  // Use the color mapping function to get the appropriate class
  const colorClass = getColorClass(color);

  return {
    id: Math.random().toString(36).substr(2, 9),
    content,
    color: colorClass,
  };
}

// Function to return a list of sticky notes based on user input
export function getStickyNotes(
  count: number,
  content?: string,
  color: string = "white"
): StickyNote[] {
  const notes: StickyNote[] = [];
  for (let i = 0; i < count; i++) {
    notes.push(createStickyNote(content || "TEXT HERE", color));
  }
  return notes;
}

// Main function to interact with Gemini API and handle sticky note creation
export async function geminiChatWithStickyNotes(
  userMessage: string,
  stickyNoteCount: number,
  content?: string,
  color: string = "white",
  history: ChatMessage[] = []
): Promise<GeminiChatResponse> {
  try {
    if (!GEMINI_API_KEY) {
      console.error("Gemini API key is not defined");
      throw new Error("API key not configured");
    }

    // Initialize the Google GenAI client
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // Define the function declaration for creating sticky notes
    const createStickyNotesSchema = {
      name: "createStickyNotes",
      description:
        "Creates a specified number of sticky notes with optional content and color",
      parameters: {
        type: Type.OBJECT,
        properties: {
          count: {
            type: Type.INTEGER,
            description: "Number of sticky notes to create",
          },
          content: {
            type: Type.STRING,
            description: "Content text for the sticky notes",
          },
          color: {
            type: Type.STRING,
            description: "Color of the sticky notes",
          },
        },
        required: ["count"],
      },
    };

    // Create a new user message
    const userChatMessage: ChatMessage = {
      role: "user",
      parts: [{ text: userMessage }],
    };

    // Combine history with new user message
    const chatHistory = [...history, userChatMessage];

    // Send request with function declarations and chat history
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: chatHistory,
      config: {
        tools: [
          {
            functionDeclarations: [createStickyNotesSchema],
          },
        ],
      },
    });

    const textResponse = response.text || "";

    // Create model response message
    const modelChatMessage: ChatMessage = {
      role: "model",
      parts: [{ text: textResponse }],
    };

    // Updated history with both the user message and model response
    const updatedHistory = [...chatHistory, modelChatMessage];

    // Check for function calls in the response
    if (response.functionCalls && response.functionCalls.length > 0) {
      const functionCall = response.functionCalls[0]; // Get the first function call

      if (functionCall.name === "createStickyNotes") {
        const args = functionCall.args as {
          count?: number;
          content?: string;
          color?: string;
        };
        const count = args.count || stickyNoteCount;

        // Use the exact content and color from the function call instead of defaults
        const noteContent = args.content || "";
        const noteColor = args.color || "yellow";

        // Generate sticky notes with the exact content and color specified by AI
        const generatedNotes = Array(count)
          .fill(0)
          .map(() => createStickyNote(noteContent, noteColor));

        return {
          stickyNotes: generatedNotes,
          responseText: textResponse,
          hasFunctionCall: true,
          history: updatedHistory,
        };
      }
    }

    // Normal chat response without function call
    return {
      stickyNotes: [],
      responseText: textResponse,
      hasFunctionCall: false,
      history: updatedHistory,
    };
  } catch (error) {
    console.error("Error calling Gemini API:", error);

    // Return fallback error message in case of error
    return {
      stickyNotes: [],
      responseText:
        "Rất tiếc, đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.",
      hasFunctionCall: false,
      history: history, // Return the original history on error
    };
  }
}

// Gemini image generation function with GoogleGenAI SDK
export async function geminiGenerateImage(
  prompt?: string
): Promise<ImageGenerationResponse> {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const contents =
      prompt ||
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
      throw new Error("No response from Gemini API");
    }

    // Process the response to extract image data
    const images: GeneratedImage[] = [];

    // Extract base64 image data from the response with proper null checks
    for (const candidate of response.candidates) {
      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (
            part.inlineData &&
            part.inlineData.mimeType?.startsWith("image/")
          ) {
            images.push({
              base64Data: part.inlineData.data,
              imageUrl: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            });
          }
        }
      }
    }

    return {
      images,
      promptId: Math.random().toString(36).substring(2, 15),
    };
  } catch (error) {
    console.error("Error in geminiGenerateImage:", error);
    return {
      images: [], // Return empty array in case of error
    };
  }
}
