/**
 * Gemini Integration for Knowledge Base
 * Exports function declarations and handlers for Gemini agents
 */

export { geminiDeepSearchDeclaration } from './tools/deepSearch';
export { handleGeminiDeepSearch } from './handlers/deepSearchHandler';

/**
 * Usage Example (Gemini Agent):
 *
 * import { GoogleGenerativeAI } from '@google/generative-ai';
 * import { geminiDeepSearchDeclaration, handleGeminiDeepSearch } from './gemini';
 *
 * const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
 * const model = genAI.getGenerativeModel({
 *   model: 'gemini-1.5-flash',
 *   tools: [{ functionDeclarations: [geminiDeepSearchDeclaration] }]
 * });
 *
 * const chat = model.startChat();
 * const result = await chat.sendMessage("What does IFRS 15 say about revenue recognition?");
 *
 * // Handle function calls
 * const call = result.response.functionCalls()[0];
 * if (call?.name === 'deep_search_kb') {
 *   const searchResult = await handleGeminiDeepSearch(call.args);
 *   const response = await chat.sendMessage({
 *     functionResponse: {
 *       name: 'deep_search_kb',
 *       response: searchResult
 *     }
 *   });
 * }
 */
