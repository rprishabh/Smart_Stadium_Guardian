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
    console.error("[Gemini Service Error]: Failed to generate advice:", error);
    console.error(error);
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
  const fallback: FanSpeechResultJson = {
    detectedLanguage: targetLanguage,
    englishTranslation: transcript,
    tacticalInstruction: "Direct the fan to the nearest security or info checkpoint."
  };

  if (!genAI) {
    return fallback;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `You are an expert multilingual FIFA World Cup stadium operational AI advisor helping a volunteer. A fan just spoke a phrase captured via speech-to-text. The input text could be phonetic Hinglish (e.g., 'Meri seet kaha parah').

Analyze this input: '${transcript}'

You must evaluate what the fan actually meant, translate it into standard English, and then give a practical routing action based on the current match phase '${matchPhase}'. Follow these strict routing rules:
1. If they are asking about their seat/location (e.g., 'seet/seat/kaha'): The englishTranslation must be 'Where is my seat?'. The tacticalInstruction must instruct the volunteer to look at the block number on their ticket stub and direct them toward the nearest matching grandstand concourse entrance.
2. If they are asking about the washroom/restroom (e.g., 'washroom/toilet/baño'): The englishTranslation must be 'Where is the washroom?'. The tacticalInstruction must tell the volunteer to guide them to the nearest available restroom layout in this sector, accounting for any match phase bottlenecks.
3. For any other request, provide the specific directional instruction matching their facility request. Do NOT use generic instructions like 'go to the nearest security or info checkpoint'.

Return your output strictly as a parseable JSON object structure matching these exact key formats:
{
  "detectedLanguage": "Hindi (Phonetic/Latin Script)",
  "englishTranslation": "The actual English meaning goes here",
  "tacticalInstruction": "The custom routing instruction based strictly on the rules above"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (!text || text.trim() === "") {
      return fallback;
    }

    const parsed = JSON.parse(text.trim());
    return {
      detectedLanguage: parsed.detectedLanguage || targetLanguage,
      englishTranslation: parsed.englishTranslation || transcript,
      tacticalInstruction: parsed.tacticalInstruction || "Direct the fan to the nearest checkpoint."
    };
  } catch (error) {
    console.error("[Gemini Service Error]: Failed to translate fan query JSON:", error);
    console.error(error);
    return fallback;
  }
}
