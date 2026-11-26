import { normalizeAnswer } from "./scoring";

/** Browser speech service (Web Speech API). Everything runs client-side. */

export const SLOW_RATE = 0.6;

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined";
}

export function loadEnglishVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!ttsSupported()) return resolve([]);
    const synth = window.speechSynthesis;
    const pick = () => synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
    const now = pick();
    if (now.length > 0) return resolve(now);
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(pick());
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 1500);
  });
}

export interface SpeakOptions {
  rate?: number;
  voiceURI?: string | null;
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

/** Speaks English text. Resolves when finished (or if speech is unavailable). */
export function speak(text: string, opts: SpeakOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text.trim()) return resolve();
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = opts.rate ?? 0.95;
    const voices = synth.getVoices();
    const chosen =
      (opts.voiceURI ? voices.find((v) => v.voiceURI === opts.voiceURI) : undefined) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en-us")) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (chosen) {
      u.voice = chosen;
      u.lang = chosen.lang;
    }
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

/* ---------- Speech recognition (optional, browser dependent) ---------- */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionResultLike {
  0: RecognitionAlternative;
  length: number;
}
interface RecognitionEventLike {
  results: ArrayLike<RecognitionResultLike>;
}
interface RecognitionErrorLike {
  error: string;
}
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: RecognitionEventLike) => void) | null;
  onerror: ((e: RecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => RecognitionLike;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported(): boolean {
  return getCtor() !== null;
}

export interface Recognizer {
  start(): void;
  stop(): void;
}

export function friendlyRecognitionError(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission was denied. Allow microphone access in your browser's site settings, or type your answer instead.";
    case "no-speech":
      return "No speech was detected. Try again closer to the microphone, or type your answer.";
    case "audio-capture":
      return "No microphone was found. Connect one, or type your answer.";
    case "network":
      return "Speech recognition needs an internet connection in this browser. Type your answer instead.";
    default:
      return "Speech recognition failed. You can type your answer instead.";
  }
}

export function createRecognizer(handlers: {
  onResult: (text: string) => void;
  onError: (message: string) => void;
  onEnd: () => void;
}): Recognizer | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  rec.onresult = (e) => {
    const parts: string[] = [];
    for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript);
    handlers.onResult(parts.join(" ").trim());
  };
  rec.onerror = (e) => handlers.onError(friendlyRecognitionError(e.error));
  rec.onend = () => handlers.onEnd();
  return {
    start: () => {
      try {
        rec.start();
      } catch {
        handlers.onError("Could not start the microphone. Please try again.");
        handlers.onEnd();
      }
    },
    stop: () => rec.stop(),
  };
}

export interface WordComparison {
  words: { word: string; matched: boolean }[];
  ratio: number;
}

/**
 * Compares recognised TEXT with the target sentence, word by word.
 * This is a text-level match, not a phonetic or pronunciation score.
 */
export function compareWords(target: string, heard: string): WordComparison {
  const heardSet = new Set(normalizeAnswer(heard).split(" ").filter(Boolean));
  const words = target
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ word: w, matched: heardSet.has(normalizeAnswer(w).split(" ").pop() ?? "") || normalizeAnswer(w).split(" ").every((p) => heardSet.has(p)) }));
  const ratio = words.length === 0 ? 0 : words.filter((w) => w.matched).length / words.length;
  return { words, ratio };
}
