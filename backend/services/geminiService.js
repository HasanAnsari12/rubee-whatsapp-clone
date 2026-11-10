// ==========================================================
// backend/services/geminiService.js
// Gemini AI Assistant Integration Service using @google/genai SDK
// ==========================================================

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const { GoogleGenAI } = require("@google/genai");

const SYSTEM_INSTRUCTION =
  "You are Rubee AI, an intelligent, helpful, and friendly AI assistant integrated into the Rubee messaging application. " +
  "You provide clear, helpful, polite, and accurate responses. You can help with answering questions, drafting messages, summarizing text, explaining code, translating languages, and brainstorming ideas. " +
  "Format your responses nicely with markdown (e.g. bolding, lists, code blocks) where helpful.";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate an AI response using the official @google/genai SDK
 * @param {Object} options
 * @param {Array<{ role: 'user' | 'model', content: string }>} options.history - Prior conversation messages
 * @param {string} options.prompt - Latest user message
 * @param {number} [options.maxRetries=2] - Automatic retries for transient 503 spikes
 * @returns {Promise<string>}
 */
  const generateAIResponse = async ({ history = [], prompt, maxRetries = 2 }) => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      const error = new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in backend/.env");
      error.statusCode = 503;
      throw error;
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-3.8-flash";

      // Build multi-turn content history for @google/genai
      const contents = [];

      for (const msg of history) {
        if (msg.content && msg.content.trim()) {
          contents.push({
            role: msg.role === "model" ? "model" : "user",
            parts: [{ text: msg.content.trim() }],
          });
        }
      }

          // Append latest prompt
          contents.push({
            role: "user",
            parts: [{ text: prompt.trim() }],
          });

          const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
              const response = await ai.models.generateContent({
                model: modelName,
                contents,
                config: {
                  systemInstruction: SYSTEM_INSTRUCTION,
                },
              });

              const responseText = response.text;
              if (!responseText) {
                throw new Error("Empty response received from Gemini API");
              }

            return responseText.trim();
          } catch (err) {
            if (err.statusCode) {
              throw err;
            }

            const errMsg = (err.message || "").toLowerCase();
            const isHighDemand =
              errMsg.includes("high demand") ||
              errMsg.includes("unavailable") ||
              errMsg.includes("503");

            if (isHighDemand && attempt < maxRetries) {
              // Wait and retry for temporary high demand spikes
              await sleep(2000 * (attempt + 1));
              continue;
            }

            // Map common Gemini API error patterns
            const customError = new Error();

            if (
              errMsg.includes("api_key_invalid") ||
              errMsg.includes("invalid api key") ||
              errMsg.includes("api key not valid")
            ) {
              customError.message =
                "Invalid Gemini API key provided. Please verify GEMINI_API_KEY.";
              customError.statusCode = 401;
            } else if (
              errMsg.includes("resource_exhausted") ||
              errMsg.includes("quota") ||
              errMsg.includes("429")
            ) {
              customError.message =
                "Gemini API rate limit or quota exceeded. Please try again shortly.";
              customError.statusCode = 429;
            } else if (isHighDemand) {
              customError.message =
                "Gemini model is currently experiencing high demand. Please try again in a moment.";
              customError.statusCode = 503;
            } else if (
              errMsg.includes("timeout") ||
              errMsg.includes("timed out") ||
              errMsg.includes("etimedout")
            ) {
              customError.message =
                "Gemini API request timed out. Please try again.";
              customError.statusCode = 504;
            } else if (
              errMsg.includes("model not found") ||
              errMsg.includes("is not found")
            ) {
              customError.message = `Configured Gemini model '${modelName}' is not available or supported.`;
              customError.statusCode = 502;
            } else {
              customError.message =
                err.message || "Failed to communicate with Gemini AI Assistant";
              customError.statusCode = 500;
            }

              throw customError;
            }
          }
        };

        module.exports = {
          generateAIResponse,
          SYSTEM_INSTRUCTION,
        };

