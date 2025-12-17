
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types.ts";

const getAI = () => {
  // Controllo difensivo per la disponibilità della chiave API
  let apiKey = '';
  try {
    // Tentativo di accesso via process.env standard
    apiKey = (process as any).env.API_KEY;
  } catch (e) {
    // Fallback se process non è definito globalmente
    apiKey = (window as any).process?.env?.API_KEY || '';
  }
  
  if (!apiKey) {
    console.warn("API Key non trovata nell'ambiente. Le funzioni Gemini saranno disabilitate.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getGeminiFeedback = async (song: Song, score: number) => {
  try {
    const ai = getAI();
    if (!ai) return "Ottimo lavoro!";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Il giocatore ha appena giocato a "${song.title}" (difficoltà ${song.difficulty}) e ha totalizzato ${score} punti. 
      Scrivi un commento brevissimo, gasante e cool in stile annunciatore di giochi arcade (in italiano).`,
    });
    return response.text || "Pazzesco!";
  } catch (error) {
    console.error("Gemini Feedback Error:", error);
    return "Continua così, spacca tutto!";
  }
};

export const getSongDescription = async (song: Song) => {
  try {
    const ai = getAI();
    if (!ai) return "Senti il ritmo!";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Scrivi una descrizione hype di massimo 15 parole per un livello di un rhythm game basato sulla canzone "${song.title}". Focus sull'energia.`,
    });
    return response.text || "Senti il ritmo!";
  } catch (error) {
    console.error("Gemini Description Error:", error);
    return "Senti il ritmo scorrere e colpisci i muri a tempo!";
  }
};
