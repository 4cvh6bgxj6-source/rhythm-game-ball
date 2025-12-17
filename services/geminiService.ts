
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getGeminiFeedback = async (song: Song, score: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The player just played "${song.title}" (${song.difficulty} difficulty) and scored ${score} points. 
      Give a short, cool, one-sentence encouraging remark in the style of a rhythm game announcer. Keep it hype!`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Keep rocking the beat!";
  }
};

export const getSongDescription = async (song: Song) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a short 20-word hype description for a rhythm game level based on the song "${song.title}". Focus on the energy and atmosphere.`,
    });
    return response.text;
  } catch (error) {
    return "Dive into the rhythm and feel the bass pulse through your veins.";
  }
};
