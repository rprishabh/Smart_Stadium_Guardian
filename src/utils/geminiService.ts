import { GoogleGenerativeAI } from "@google/generative-ai";

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
 * @returns Strict 2-sentence tactical recommendation string.
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

export interface FanSpeechResultJson {
  detectedLanguage: string;
  englishTranslation: string;
  tacticalInstruction: string;
}

/**
 * Translates a fan query (including Hinglish/script mixing) to English
 * and provides structured tactical instruction.
 */
export async function translateFanQuery(
  transcript: string,
  targetLanguage: string,
  matchPhase: string
): Promise<FanSpeechResultJson> {
  if (!genAI) {
    throw new Error("Gemini AI is not initialized. Please verify your REACT_APP_GEMINI_API_KEY environment variable.");
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a stadium security translation AI. A fan said: '${transcript}'. 1. Identify the language (even if it's written in English characters like Hinglish). 2. Translate it to English. 3. Provide a one-sentence tactical routing instruction for stadium staff. Return EXACTLY this JSON format: { "detectedLanguage": "...", "englishTranslation": "...", "tacticalInstruction": "..." }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text || text.trim() === "") {
      throw new Error("Empty response received from Gemini API.");
    }

    let cleanedText = text.trim();
    // Remove markdown code fences if present
    if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    cleanedText = cleanedText.trim();

    const parsed = JSON.parse(cleanedText);

    return {
      detectedLanguage: parsed.detectedLanguage || "Unknown",
      englishTranslation: parsed.englishTranslation || transcript,
      tacticalInstruction: parsed.tacticalInstruction || "Direct the fan to the nearest security or info checkpoint."
    };
  } catch (error) {
    console.error("TRANSLATION API ERROR:", error);
    throw error;
  }
}
