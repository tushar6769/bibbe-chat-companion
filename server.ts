/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-loaded GoogleGenAI client helper
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it to your secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. AI BIBLE CHAT ENDPOINT
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    let ai;
    try {
      ai = getAiClient();
    } catch (keyErr: any) {
      // Elegant fallback response when API key is missing
      console.warn("Gemini API Key missing, sending rich fallback chat response.");
      return res.json({
        text: `*A gentle reminder: To connect FaithFlow AI to live scripture counseling, please add your **GEMINI_API_KEY** in the **Secrets/Settings** panel. Below is a thoughtful reflection on your quest:*

"Seek, and you will find; knock, and the door will be opened to you." (Matthew 7:7)

Even in silence, your seeking heart is heard. Whether you are walking through a season of doubt or searching for deep sanctuary, peace is already yours. Focus on breathing slowly, inviting a warm gold glow of comfort into your current prayer space. How can I guide your meditation today?`,
        isFallback: true
      });
    }

    // Map client-side messages to the standard Gemini SDK contents structure
    // We filter and map the last few messages to conserve tokens and keep it responsive
    const recentMessages = messages.slice(-8); // keep last 8 messages
    const contents = recentMessages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: "You are FaithFlow AI, a premium, emotionally calming, compassionate spiritual companion. You offer peaceful biblical insights, empathetic prayer-inspired guidance, and theological explanations. Your tone is warm, gentle, wise, and deeply reflective (similar to Hallow or Headspace prayer guides). Maintain a peaceful, warm atmosphere. Keep your answers relatively concise, with beautiful paragraph line breaks (limit to 2-3 short, breathing paragraphs). Always end with a very brief, comforting, one-sentence blessing or prompt for reflection.",
        temperature: 0.7,
      },
    });

    res.json({ text: response.text || "I am reflecting on this in quiet prayers. Please ask again in a moment." });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "An error occurred during chat reflection." });
  }
});

// 2. DYNAMIC DEVOTIONAL GENERATOR ENDPOINT
app.post("/api/devotional", async (req, res) => {
  try {
    const { theme, focus } = req.body;
    const chosenTheme = theme || "Peace & Sanctuary";
    const chosenFocus = focus || "finding quiet calm in a busy world";

    let ai;
    try {
      ai = getAiClient();
    } catch (keyErr: any) {
      // Rich premium fallback presets when API key is absent
      console.warn("Gemini API Key missing, sending rich fallback devotional preset.");
      return res.json({
        verse: "Peace I leave with you; my peace I give to you. I do not give to you as the world gives. Do not let your hearts be troubled and do not be afraid.",
        reference: "John 14:27",
        title: "The Sanctuary of the Present Moment",
        reflection: "In the rush of our modern schedules, we often treat peace as a destination—something we will earn once all tasks are complete. Yet Christ speaks of peace not as an achievement, but as an active gift already left in our custody. True spiritual breathing is the act of stepping away from the cognitive storms and stepping into this sanctuary. Today, allow your shoulders to lower, take a slow breath, and know you are fully enclosed in grace.",
        prayer: "Heavenly Father, I receive the peace You have already laid out for me. Quiet my anxious thoughts, anchor my mind in Your presence, and let my words today flow with gentleness. Amen.",
        isFallback: true
      });
    }

    const prompt = `Generate a beautiful, premium, emotionally calming daily devotional based on the spiritual theme: "${chosenTheme}" and focusing on: "${chosenFocus}".
Your response must be in JSON format matching the following structure exactly. Do not include markdown codeblocks or any enclosing text, just pure JSON:
{
  "verse": "A relevant, highly comforting biblical verse text (KJV, ESV, or NIV)",
  "reference": "The book, chapter, and verse references (e.g., Philippians 4:6)",
  "title": "A poetic, inspiring, cinematic title for this devotional",
  "reflection": "A beautiful, emotionally resonant, highly thoughtful 3-paragraph reflection exploring how this scripture acts as a balm for today's dynamic pressures. Use rich, warm, Headspace-style guiding words.",
  "prayer": "A gentle, deeply calming closing prayer (2-3 sentences) styled for personal spiritual restoration."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.85,
      },
    });

    const outputText = response.text || "{}";
    try {
      const parsedDevotional = JSON.parse(outputText);
      res.json(parsedDevotional);
    } catch (parseError) {
      console.error("Error parsing generated JSON, sending fallback:", outputText);
      res.status(500).json({ error: "Spiritual reflection took an unexpected path. Please try to generate again." });
    }
  } catch (error: any) {
    console.error("Error in /api/devotional:", error);
    res.status(500).json({ error: error.message || "An error occurred during devotional generation." });
  }
});

// 3. TEXT-TO-SPEECH (TTS) GUIDED PRAYER AUDIO ENDPOINT
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required for TTS narrative synthesis." });
    }

    const voiceName = voice || "Kore"; // Prebuilt voice options: Puck, Charon, Kore, Fenrir, Zephyr

    let ai;
    try {
      ai = getAiClient();
    } catch (keyErr: any) {
      console.warn("Gemini API Key missing, TTS unavailable.");
      return res.status(400).json({
        error: "Gemini API Secret is needed to synthesize live spiritual voices. Please add GEMINI_API_KEY to secrets."
      });
    }

    // Clean text to avoid speech hiccups
    const cleanText = text.replace(/[*#_"]/g, " ").trim();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Read with absolute serenity, soft rhythmic pacing, and supportive warmth for a prayer meditation: ${cleanText}` }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (base64Audio) {
      res.json({ base64Audio });
    } else {
      res.status(500).json({ error: "Could not generate elegant speech audio stream." });
    }
  } catch (error: any) {
    console.error("Error in /api/tts:", error);
    res.status(500).json({ error: error.message || "An error occurred during voice synthesis." });
  }
});

// Vite & Static Asset configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FaithFlow AI full-stack server running on standard port:${PORT}`);
  });
}

startServer();
