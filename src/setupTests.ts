// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';

// 1. Define global mock spies for the AI SDK
const mockGenerateContent = jest.fn();
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

// 2. Mock the module globally so that cached module references across tests are identical
jest.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => {
      return {
        getGenerativeModel: mockGetGenerativeModel,
      };
    }),
  };
});

// Expose mock spies on global context for test access
(global as any).mockGenerateContent = mockGenerateContent;
(global as any).mockGetGenerativeModel = mockGetGenerativeModel;

// 3. Set standard mock environment variables
process.env.REACT_APP_GEMINI_API_KEY = "mock-valid-token-from-jest-harness";
process.env.REACT_APP_FIREBASE_API_KEY = "mock-firebase-api-key";
process.env.REACT_APP_FIREBASE_AUTH_DOMAIN = "stadium-guardian.firebaseapp.com";
process.env.REACT_APP_FIREBASE_PROJECT_ID = "stadium-guardian";
process.env.REACT_APP_FIREBASE_STORAGE_BUCKET = "stadium-guardian.appspot.com";
process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID = "1234567890";
process.env.REACT_APP_FIREBASE_APP_ID = "1:1234:web:abcd";
