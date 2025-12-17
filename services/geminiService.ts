
import { GoogleGenAI } from "@google/genai";
import { Song } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeminiFeedback = async (song: Song, score: number) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Il giocatore ha appena giocato a "${song.title}" (difficoltà ${song.difficulty}) e ha totalizzato ${score} punti. 
      Scrivi un commento brevissimo, gasante e cool in stile annunciatore di giochi arcade (in italiano).`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Continua così, spacca tutto!";
  }
};

export const getSongDescription = async (song: Song) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Scrivi una descrizione hype di massimo 15 parole per un livello di un rhythm game basato sulla canzone "${song.title}". Focus sull'energia.`,
    });
    return response.text;
  } catch (error) {
    return "Senti il ritmo scorrere e colpisci i muri a tempo!";
  }
};
