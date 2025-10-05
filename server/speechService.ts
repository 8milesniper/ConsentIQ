// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

import { GoogleGenAI } from "@google/genai";
import fs from "fs";

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface ConsentAnalysisResult {
  decision: "CONSENT_GRANTED" | "CONSENT_DENIED" | "UNCLEAR";
  confidence: number;
  reasoning: string;
}

export async function analyzeConsentVideo(videoPath: string, mimeType: string): Promise<ConsentAnalysisResult> {
  try {
    const systemPrompt = `You are a consent verification AI assistant. 
    
Your job is to analyze video consent recordings and determine if the person clearly grants or denies consent.

Look for:
- Clear verbal consent: "Yes, I consent", "I agree", "Yes, I give my consent"
- Clear verbal denial: "No, I don't consent", "I disagree", "No, I do not consent" 
- The person stating their name (adds authenticity)
- Body language that matches their words

Return JSON in this exact format:
{
  "decision": "CONSENT_GRANTED" | "CONSENT_DENIED" | "UNCLEAR",
  "confidence": number between 0.1 and 1.0,
  "reasoning": "Brief explanation of your decision"
}

CONSENT_GRANTED: Clear positive consent with matching body language
CONSENT_DENIED: Clear denial of consent
UNCLEAR: Mumbled, unclear, contradictory, or missing audio/video`;

    // Ensure we use the correct MIME type for video analysis
    const supportedTypes = ["video/mp4", "video/webm", "video/quicktime", "video/avi"];
    const videoMimeType = supportedTypes.includes(mimeType) ? mimeType : "video/webm"; // Default to webm for browser recordings

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            decision: { 
              type: "string", 
              enum: ["CONSENT_GRANTED", "CONSENT_DENIED", "UNCLEAR"] 
            },
            confidence: { type: "number" },
            reasoning: { type: "string" },
          },
          required: ["decision", "confidence"],
        },
      },
      contents: [
        {
          inlineData: {
            data: fs.readFileSync(videoPath).toString('base64'),
            mimeType: videoMimeType,
          },
        },
        "Analyze this consent video and determine if the person clearly grants or denies consent.",
      ],
    });

    const rawJson = response.text;
    console.log(`Consent Analysis Result: ${rawJson}`);

    if (rawJson) {
      const result: ConsentAnalysisResult = JSON.parse(rawJson);
      return result;
    } else {
      throw new Error("Empty response from Gemini model");
    }
  } catch (error) {
    console.error("Error analyzing consent video:", error);
    return {
      decision: "UNCLEAR",
      confidence: 0.0,
      reasoning: `Analysis failed: ${error}`
    };
  }
}

export async function transcribeAudio(audioData: Buffer, mimeType: string): Promise<{ transcript: string; confidence: number }> {
  try {
    const systemPrompt = `You are a speech transcription assistant. 
    
Your job is to transcribe audio with high accuracy, focusing on consent-related statements.

Return JSON in this exact format:
{
  "transcript": "Exact transcription of what was said",
  "confidence": number between 0.1 and 1.0
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", 
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            transcript: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["transcript", "confidence"],
        },
      },
      contents: [
        {
          inlineData: {
            data: audioData.toString('base64'),
            mimeType: mimeType,
          },
        },
        "Transcribe this audio accurately, focusing on any consent-related statements.",
      ],
    });

    const rawJson = response.text;
    console.log(`Transcription Result: ${rawJson}`);

    if (rawJson) {
      const result = JSON.parse(rawJson);
      return result;
    } else {
      throw new Error("Empty response from Gemini model");
    }
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return {
      transcript: `Transcription failed: ${error}`,
      confidence: 0.0
    };
  }
}

export function determineAudioMismatch(
  aiDecision: string, 
  buttonChoice: string, 
  confidence: number
): boolean {
  // Only flag mismatches for high-confidence AI decisions (70+ out of 100)
  if (confidence < 70) return false;
  
  const aiSaysGranted = aiDecision === "CONSENT_GRANTED";
  const buttonSaysGranted = buttonChoice === "granted";
  
  // Mismatch if AI and button disagree
  return aiSaysGranted !== buttonSaysGranted;
}

// Helper function to scale confidence from 0-1 to 0-100 for database storage
export function scaleConfidence(geminiConfidence: number): number {
  return Math.round(geminiConfidence * 100);
}