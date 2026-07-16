import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

/**
 * 🔒 Zod Schema to strictly validate the JSON response structure from the Gemini translation engine.
 * Ensures the response matches our frontend interface precisely at runtime.
 */
export const FanSpeechSchema = z.object({
  detectedLanguage: z.string().min(1, "Detected language must be a non-empty string."),
  englishTranslation: z.string().min(1, "English translation must be a non-empty string."),
  tacticalInstruction: z.string().min(1, "Tactical instruction must be a non-empty string."),
});

/**
 * 📝 TypeScript interface matching the validated FanSpeechSchema shape.
 */
export interface FanSpeechResultJson {
  detectedLanguage: string;
  englishTranslation: string;
  tacticalInstruction: string;
}

const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
const hasValidApiKey = apiKey && apiKey !== "your_gemini_api_key_here" && apiKey.trim() !== "";

let genAI: GoogleGenerativeAI | null = null;
if (hasValidApiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error("Failed to initialize Google Generative AI in geminiService:", error);
  }
}

/**
 * Generates tactical crowd control advice for frontline volunteers based on zone metrics.
 * 
 * @param capacity Current zone capacity utilization percentage.
 * @param incidents Number of active security/safety incidents.
 * @param timelineState The current phase of the match timeline (e.g. Pre-Match, Half-Time).
 * @param criticalSector The sector identification string under review.
 * @returns {Promise<string>} A promise resolving to a strict 2-sentence tactical recommendation string.
 */
export async function generateCrowdAdvice(
  capacity: number,
  incidents: number,
  timelineState: string,
  criticalSector: string
): Promise<string> {
  const fallbackMessage = `Alert: Capacity in ${criticalSector} is at ${capacity}% with ${incidents} incident(s) during ${timelineState}. Deploy volunteers immediately to divert the crowd.`;

  if (!genAI) {
    return fallbackMessage;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `You are a FIFA World Cup stadium AI. The active match state timeline is "${timelineState}" and the sector under review is "${criticalSector}". The sector is currently at ${capacity}% capacity with ${incidents} active incidents. Give a strict 2-sentence tactical recommendation for the ground volunteers managing this specific sector.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text || text.trim() === "") {
      return fallbackMessage;
    }

    return text.trim();
  } catch (error) {
    console.error("GEMINI API FAILURE:", error);
    return fallbackMessage;
  }
}

/**
 * Translates a fan speech transcript (including Hinglish or script mixing) to English,
 * then structures a tactical routing instruction for security staff. Enforces Zod schema validation.
 * 
 * @param transcript Raw speech-to-text text captured from the fan query.
 * @param targetLanguage Target display language (e.g. English, Spanish).
 * @param matchPhase Current match operational phase.
 * @returns {Promise<FanSpeechResultJson>} A promise resolving to the structured translation and instruction object.
 * @throws {Error} Throws validation errors if JSON format is corrupt or missing fields.
 */
export async function translateFanQuery(
  transcript: string,
  targetLanguage: string,
  matchPhase: string
): Promise<FanSpeechResultJson> {
  /** Safe fallback returned when the API is unavailable, times out, or returns corrupt data. */
  const fallbackResult: FanSpeechResultJson = {
    detectedLanguage: "English",
    englishTranslation: "Connection timed out.",
    tacticalInstruction: "Network congested. Proceed with standard protocol.",
  };

  if (!genAI) {
    return fallbackResult;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

    const prompt = `You are a stadium security translation AI. A fan said: '${transcript}'. 1. Identify the language (even if it's written in English characters like Hinglish). 2. Translate it to English. 3. Provide a one-sentence tactical routing instruction for stadium staff. Return EXACTLY this JSON format: { "detectedLanguage": "...", "englishTranslation": "...", "tacticalInstruction": "..." }`;

    // Race the API call against a 15-second timeout to prevent UI hangs
    const timeoutMs = 15_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API request timed out after 15 seconds.")), timeoutMs)
    );

    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ]);

    const text = result.response.text();

    if (!text || text.trim() === "") {
      return fallbackResult;
    }

    let cleanedText = text.trim();
    // Remove markdown code fences if present
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    cleanedText = cleanedText.trim();

    const parsedJson = JSON.parse(cleanedText);
    
    // Enforce strict schema constraints at runtime
    const validated = FanSpeechSchema.parse(parsedJson);

    return {
      detectedLanguage: validated.detectedLanguage,
      englishTranslation: validated.englishTranslation,
      tacticalInstruction: validated.tacticalInstruction
    };
  } catch (error) {
    console.error("TRANSLATION API ERROR:", error);
    return fallbackResult;
  }
}
