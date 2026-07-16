// Mock setup with environment variables
process.env.REACT_APP_GEMINI_API_KEY = "mock-valid-token-from-jest-harness";

const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

// Mock the Google Generative AI module using a lazy getter to prevent ReferenceErrors during hoisted execution
jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: (...args: any[]) => mockGetGenerativeModel(...args),
      };
    }),
  };
});

import { evaluateStadiumMetrics } from "./geminiEngine";
import { TelemetryPoint } from "../types/telemetry";

describe("Gemini 1.5 Pro AI Reasoning Engine Tests", () => {
  const sampleTelemetryPoint: TelemetryPoint = {
    zoneId: "Zone A (North Gate)",
    gateCapacityPercentage: 88,
    securityThroughputPerMin: 35,
    concessionWaitTimeMins: 15,
    activeIncidentsCount: 1,
    timestamp: 1718105000000,
  };

  const sampleTelemetryArray: TelemetryPoint[] = [sampleTelemetryPoint];
  const mockCctvUrl = "https://www.youtube.com/watch?v=mock_feed_url";

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure getGenerativeModel returns the model structure by default
    mockGetGenerativeModel.mockReturnValue({
      generateContent: mockGenerateContent,
    });
  });

  it("should successfully generate a strategic directive under normal operational calls", async () => {
    const mockOutputText = "ALERT: Reallocate 3 volunteers from concession wait lines to Zone A immediately.";
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => mockOutputText,
      },
    });

    const directive = await evaluateStadiumMetrics(sampleTelemetryArray, "English", mockCctvUrl);

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: "gemini-3.5-flash" });
    expect(mockGenerateContent).toHaveBeenCalled();
    expect(directive).toBe(mockOutputText);
  });

  it("should catch empty API string responses and return the safe fallback control directive", async () => {
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "   ",
      },
    });

    const directive = await evaluateStadiumMetrics(sampleTelemetryArray, "Spanish", mockCctvUrl);
    expect(directive).toBe("AI offline. Please refer to standard manual crowd control protocols.");
  });

  it("should activate the catch-all error boundary and return the safe manual fallback on API timeouts or failures", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Gemini API Network Exception or Rate Limit"));

    const directive = await evaluateStadiumMetrics(sampleTelemetryArray, "French", mockCctvUrl);
    expect(directive).toBe("AI offline. Please refer to standard manual crowd control protocols.");
  });
});
