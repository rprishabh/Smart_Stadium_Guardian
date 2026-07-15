import { GoogleGenerativeAI } from "@google/generative-ai";
import { TelemetryPoint } from "../types/telemetry";

// Retrieve API Key cleanly
const apiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
// Modified: only block the explicit boilerplate placeholder string itself
const hasValidApiKey = apiKey && apiKey !== "your_gemini_api_key_here" && apiKey.trim() !== "";

let genAI: GoogleGenerativeAI | null = null;
if (hasValidApiKey) {
  try {
    genAI = new GoogleGenerativeAI(apiKey);
  } catch (error) {
    console.error("Failed to initialize Google Generative AI:", error);
  }
} else {
  console.warn(
    "[Gemini Engine Warning]: REACT_APP_GEMINI_API_KEY is missing or empty. Engine running in offline mode."
  );
}

/**
 * Evaluates stadium telemetry metrics in correlation with live CCTV streams.
 * 
 * @param telemetry List of telemetry data points for active stadium zones.
 * @param userLanguage Target translation language for the frontline volunteer.
 * @param cctvUrl Address of the operational YouTube CCTV stream.
 * @returns Strategic operational directive string.
 */
export async function evaluateStadiumMetrics(
  telemetry: TelemetryPoint[],
  userLanguage: string,
  cctvUrl: string
): Promise<string> {
  const fallbackMessage = "AI offline. Please refer to standard manual crowd control protocols.";

  if (!genAI) {
    return fallbackMessage;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Format the telemetry data cleanly for prompt digestion
    const serializedMetrics = telemetry
      .map(
        (point) =>
          `- Zone: ${point.zoneId} | Gate Capacity: ${point.gateCapacityPercentage}% | Security Throughput: ${point.securityThroughputPerMin}/min | Concession Wait: ${point.concessionWaitTimeMins} mins | Active Incidents: ${point.activeIncidentsCount}`
      )
      .join("\n");

    const prompt = `You are the "Stadium Guardian AI Core", an elite operational brain managing the FIFA World Cup 2026 Smart Stadium operations.
Analyze the following real-time telemetry metrics:
${serializedMetrics}

Live CCTV Feed Reference: ${cctvUrl || "No active stream URL configured."}

Instructions:
1. Identify and flag any bottlenecks where gate capacity exceeds 80% or active incidents count is greater than 0.
2. Simulate analyzing the provided CCTV feed URL in conjunction with the telemetry data to generate contextual crowd control directives. If the CCTV URL is provided, mention it in the context of the visual feed logs.
3. Generate a highly strategic, actionable, and concise operational directive specifically for frontline volunteers and security staff.
4. Translate the response perfectly into the requested language: "${userLanguage}".
5. Output ONLY the directive text. Do not write intros, explanations, markdown wrappers, or metadata.`;

    const apiCallPromise = model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API call timed out")), 15000)
    );

    const result = await Promise.race([apiCallPromise, timeoutPromise]);
    const response = result.response;
    const text = response.text();

    if (!text || text.trim() === "") {
      return fallbackMessage;
    }

    return text.trim();
  } catch (error) {
    console.error("[Gemini Engine Error]: Failed to evaluate metrics:", error);
    console.error(error);
    return fallbackMessage;
  }
}
