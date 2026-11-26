"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info, Mic, MicOff, Square, Turtle, Volume2 } from "lucide-react";
import { useApp } from "./AppProvider";
import { Button, Notice } from "./ui";
import { compareWords, createRecognizer, recognitionSupported, SLOW_RATE, speak, stopSpeaking, ttsSupported, type Recognizer } from "@/lib/speech";
import { cn } from "@/lib/util";

/** Client-only feature detection that is safe for hydration. */
export function useSpeechSupport() {
  const [state, setState] = useState({ tts: false, stt: false, checked: false });
  // Feature detection must run on the client after hydration.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setState({ tts: ttsSupported(), stt: recognitionSupported(), checked: true }), []);
  return state;
}

export function useSpeaker() {
  const { data } = useApp();
  const rate = data.settings?.speechRate ?? 0.9;
  const voiceURI = data.settings?.voiceURI ?? null;
  const [speaking, setSpeaking] = useState<string | null>(null);
  const play = useCallback(
    async (text: string, slow = false) => {
      const key = `${slow ? "slow" : "normal"}:${text}`;
      setSpeaking(key);
      await speak(text, { rate: slow ? SLOW_RATE : rate, voiceURI });
      setSpeaking((cur) => (cur === key ? null : cur));
    },
    [rate, voiceURI],
  );
  const stop = useCallback(() => {
    stopSpeaking();
    setSpeaking(null);
  }, []);
  useEffect(() => () => stopSpeaking(), []);
  return { play, stop, speaking };
}

export function SpeakButton({ text, slow = false, size = "md", label, className }: { text: string; slow?: boolean; size?: "sm" | "md" | "lg"; label?: string; className?: string }) {
  const { tts, checked } = useSpeechSupport();
  const { play, speaking } = useSpeaker();
  const active = speaking === `${slow ? "slow" : "normal"}:${text}`;
  const dim = size === "lg" ? "size-16" : size === "md" ? "size-11" : "size-9";
  const icon = size === "lg" ? "size-7" : "size-5";
  const Icon = slow ? Turtle : Volume2;
  const aria = label ?? (slow ? "Play slowly" : "Play audio");
  return (
    <button
      type="button"
      onClick={() => play(text, slow)}
      disabled={checked && !tts}
      aria-label={aria}
      title={checked && !tts ? "Audio is not supported in this browser" : aria}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-b-4 transition-all active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40",
        slow ? "border-line bg-white" : "border-brand-dark bg-brand",
        active && "ring-4 ring-brand/50",
        dim,
        className,
      )}
    >
      <Icon className={icon} aria-hidden />
    </button>
  );
}

export function SpeakControls({ text, size = "md" }: { text: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2">
      <SpeakButton text={text} size={size} />
      <SpeakButton text={text} slow size={size === "lg" ? "md" : size} />
    </div>
  );
}

export function SpeechUnavailableNote() {
  const { tts, checked } = useSpeechSupport();
  if (!checked || tts) return null;
  return (
    <Notice tone="info" title="Audio is not available in this browser">
      Text-to-speech isn&apos;t supported here. You can still read every sentence and its transcript. Chrome, Edge and Safari work best.
    </Notice>
  );
}

/** Explains browser permission and compatibility limits. */
export function SpeechHelp() {
  return (
    <details className="rounded-2xl border border-line bg-white p-4 text-sm">
      <summary className="flex cursor-pointer items-center gap-2 font-bold">
        <Info className="size-4" aria-hidden /> How speech features work
      </summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
        <li>Audio playback uses your browser&apos;s built-in voices. Available voices depend on your device and browser.</li>
        <li>Speech recognition is optional. It works in Chrome, Edge and Safari; Firefox does not support it. You must allow microphone access when the browser asks.</li>
        <li>In Chrome and Edge, recognition may send your audio to the browser vendor&apos;s servers, and it needs an internet connection. Lumo itself never uploads your audio.</li>
        <li>Recognition shows what the browser <em>heard as text</em>. It is not a phonetic score — it cannot judge accent or intonation accurately. Use it as a rough check and always confirm the text.</li>
        <li>If the microphone is blocked or unsupported, use the text box instead — everything works without it.</li>
      </ul>
    </details>
  );
}

/** Speak-and-confirm component with a text-input fallback. */
export function SpeechInput({ onSubmit, placeholder = "Type your answer…", submitLabel = "Use this answer", disabled, clearOnSubmit = false }: { onSubmit: (text: string) => void; placeholder?: string; submitLabel?: string; disabled?: boolean; clearOnSubmit?: boolean }) {
  const { stt, checked } = useSpeechSupport();
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [heard, setHeard] = useState(false);
  const rec = useRef<Recognizer | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  const start = () => {
    setError(null);
    setHeard(false);
    const r = createRecognizer({
      onResult: (t) => {
        setText(t);
        setHeard(true);
      },
      onError: (m) => setError(m),
      onEnd: () => setListening(false),
    });
    if (!r) {
      setError("Speech recognition is not supported in this browser. Please type instead.");
      return;
    }
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {checked && stt && (
          <Button variant={listening ? "danger" : "secondary"} onClick={listening ? () => rec.current?.stop() : start} aria-label={listening ? "Stop listening" : "Speak your answer"} disabled={disabled} className="shrink-0 px-4">
            {listening ? <Square className="size-4" aria-hidden /> : <Mic className="size-5" aria-hidden />}
            <span className="hidden sm:inline">{listening ? "Listening…" : "Speak"}</span>
          </Button>
        )}
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setHeard(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              onSubmit(text.trim());
              if (clearOnSubmit) setText("");
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          aria-label="Your answer"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-white px-5 text-[15px] outline-none focus:border-ink"
        />
        <Button
          onClick={() => {
            onSubmit(text.trim());
            if (clearOnSubmit) setText("");
          }}
          disabled={disabled || !text.trim()}
        >
          {submitLabel}
        </Button>
      </div>
      {heard && <p className="text-sm text-muted">The browser heard the text above. Edit it if it&apos;s wrong, then confirm.</p>}
      {checked && !stt && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <MicOff className="size-4" aria-hidden /> Speech recognition isn&apos;t supported in this browser — type your answer instead.
        </p>
      )}
      {error && <Notice tone="warning">{error}</Notice>}
    </div>
  );
}

/** Pronunciation practice: listen, repeat, then compare recognised text with the target. */
export function SpeechPractice({ target, translation }: { target: string; translation?: string }) {
  const [result, setResult] = useState<ReturnType<typeof compareWords> | null>(null);
  const [heardText, setHeardText] = useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-cream p-4">
        <p className="text-xl font-extrabold leading-snug">{target}</p>
        {translation && <p className="mt-1 text-sm text-muted">{translation}</p>}
        <div className="mt-3">
          <SpeakControls text={target} />
        </div>
      </div>
      <SpeechInput
        placeholder="Say it, or type what you said…"
        submitLabel="Compare"
        onSubmit={(t) => {
          setHeardText(t);
          setResult(compareWords(target, t));
        }}
      />
      {result && (
        <div className="rounded-2xl border border-line p-4" aria-live="polite">
          <p className="mb-2 text-sm font-bold">You said: “{heardText}”</p>
          <p className="flex flex-wrap gap-1.5">
            {result.words.map((w, i) => (
              <span key={i} className={cn("rounded-full px-3 py-1 text-sm font-bold", w.matched ? "bg-success-soft text-[#1d6b3c]" : "bg-danger-soft text-danger")}>
                {w.word}
              </span>
            ))}
          </p>
          <p className="mt-3 text-sm text-muted">
            {Math.round(result.ratio * 100)}% of the words matched. This compares recognised <em>text</em> only; it is not a pronunciation or accent score.
          </p>
        </div>
      )}
    </div>
  );
}
