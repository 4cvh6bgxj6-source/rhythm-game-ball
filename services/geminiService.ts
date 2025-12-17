
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types.ts";

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const getGeminiFeedback = async (song: Song, score: number) => {
  try {
    const ai = getAI();
    if (!ai) return "Ottimo lavoro!";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Il giocatore ha giocato a "${song.title}" (${song.difficulty}) e ha fatto ${score} punti. 
      Scrivi un commento arcade cool (italiano), brevissimo (max 6 parole).`,
    });
    return response.text || "Pazzesco!";
  } catch (error) {
    return "Continua così, spacca tutto!";
  }
};

export const getSongDescription = async (song: Song) => {
  try {
    const ai = getAI();
    if (!ai) return "Senti il ritmo!";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Descrivi hype per un rhythm game della canzone "${song.title}". Max 12 parole.`,
    });
    return response.text || "Senti il ritmo!";
  } catch (error) {
    return "Colpisci i muri a tempo e spacca tutto!";
  }
};
