"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui";
import { SpeakButton, SpeakControls, SpeechUnavailableNote, useSpeaker } from "./Speech";
import { checkExercise, expectedAnswer, responseToText } from "@/lib/scoring";
import type { Exercise, Response } from "@/lib/types";
import { cn, seededShuffle } from "@/lib/util";

export interface CheckedResult {
  correct: boolean;
  answer: string;
}

interface Props {
  exercise: Exercise;
  onChecked: (r: CheckedResult) => void;
  onContinue: () => void;
  continueLabel?: string;
}

function choiceOptions(ex: Exercise): string[] | null {
  switch (ex.type) {
    case "multiple-choice":
    case "fill-blank":
    case "dialogue":
    case "reading":
      return ex.options;
    case "listening":
      return ex.mode === "choose" ? ex.options : null;
    default:
      return null;
  }
}

const INSTRUCTIONS: Record<Exercise["type"], string> = {
  "multiple-choice": "Choose the correct answer",
  translation: "Translate this sentence",
  "word-order": "Put the words in order",
  "sentence-construction": "Build the sentence in English",
  matching: "Tap the matching pairs",
  "fill-blank": "Fill in the blank",
  listening: "Listening",
  dialogue: "Complete the dialogue",
  reading: "Read and answer",
};

export function ExerciseView({ exercise, onChecked, onContinue, continueLabel = "Continue" }: Props) {
  const [response, setResponse] = useState<Response | null>(null);
  const [result, setResult] = useState<{ correct: boolean; note?: string } | null>(null);

  const submit = (resp: Response, forced?: boolean, note?: string) => {
    if (result) return;
    const correct = forced ?? checkExercise(exercise, resp);
    setResult({ correct, note });
    onChecked({ correct, answer: responseToText(resp) });
  };

  const canCheck =
    exercise.type !== "matching" && response !== null && (typeof response === "string" ? response.trim().length > 0 : response.length > 0);

  // Enter checks / continues (unless a button or link has focus, which handles Enter itself)
  const stateRef = useRef({ canCheck, result, response });
  useEffect(() => {
    stateRef.current = { canCheck, result, response };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "BUTTON" || t.tagName === "A")) return;
      const s = stateRef.current;
      if (s.result) onContinue();
      else if (s.canCheck && s.response !== null) submit(s.response);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto px-4 pb-6 pt-6">
        <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-muted">{INSTRUCTIONS[exercise.type]}</p>
        <Body exercise={exercise} response={response} setResponse={setResponse} result={result} onMatchDone={(mistakes, pairs) => submit(pairs, mistakes === 0, mistakes > 0 ? `${mistakes} wrong ${mistakes === 1 ? "try" : "tries"}` : undefined)} onSubmitText={() => response !== null && submit(response)} />
      </div>

      <footer
        className={cn(
          "safe-bottom border-t px-4 pt-4 transition-colors",
          !result && "border-line bg-white",
          result?.correct && "border-success/30 bg-success-soft",
          result && !result.correct && "border-danger/30 bg-danger-soft",
        )}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          {result ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 flex-1" aria-live="polite">
              <p className={cn("flex items-center gap-2 text-lg font-extrabold", result.correct ? "text-[#1d6b3c]" : "text-danger")}>
                {result.correct ? <Check className="size-5" aria-hidden /> : <X className="size-5" aria-hidden />}
                {result.correct ? (result.note ? "Done — but check the pairs" : "Correct!") : exercise.type === "matching" ? "Not quite" : "Correct answer:"}
              </p>
              {!result.correct && exercise.type !== "matching" && <p className="mt-0.5 font-bold">{expectedAnswer(exercise)}</p>}
              <p className="mt-1 text-sm text-ink/80">{exercise.explanation}</p>
            </motion.div>
          ) : (
            <p className="hidden flex-1 text-sm text-muted sm:block">{exercise.type === "matching" ? "Match all the pairs to continue." : "Press Enter to check."}</p>
          )}
          {result ? (
            <Button variant={result.correct ? "success" : "danger"} size="lg" onClick={onContinue} className="w-full sm:w-auto" autoFocus>
              {continueLabel}
            </Button>
          ) : exercise.type === "matching" ? null : (
            <Button size="lg" onClick={() => response !== null && submit(response)} disabled={!canCheck} className="w-full sm:w-auto">
              Check
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}

interface BodyProps {
  exercise: Exercise;
  response: Response | null;
  setResponse: (r: Response | null) => void;
  result: { correct: boolean } | null;
  onMatchDone: (mistakes: number, pairs: string[]) => void;
  onSubmitText: () => void;
}

function Body({ exercise: ex, response, setResponse, result, onMatchDone, onSubmitText }: BodyProps) {
  const locked = result !== null;
  const options = useMemo(() => {
    const o = choiceOptions(ex);
    return o ? seededShuffle(o, ex.id) : null;
  }, [ex]);
  const correctChoice = ex.type === "listening" ? ex.text : "answer" in ex && typeof ex.answer === "string" ? ex.answer : null;
  const selected = typeof response === "string" ? response : null;

  const choiceList = options && (
    <div role="radiogroup" aria-label="Answer options" className="mt-5 grid gap-3">
      {options.map((o, i) => {
        const isSel = selected === o;
        const isCorrect = locked && o === correctChoice;
        const isWrong = locked && isSel && o !== correctChoice;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={isSel}
            disabled={locked}
            onClick={() => setResponse(o)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 border-b-4 bg-white px-4 py-3.5 text-left text-[16px] font-semibold transition-all",
              !locked && !isSel && "border-line hover:bg-cream",
              !locked && isSel && "border-ink bg-brand-soft",
              isCorrect && "border-success bg-success-soft",
              isWrong && "border-danger bg-danger-soft",
              locked && !isCorrect && !isWrong && "border-line opacity-60",
            )}
          >
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg border text-xs font-extrabold", isSel ? "border-ink bg-ink text-white" : "border-line text-muted")}>{i + 1}</span>
            {o}
          </button>
        );
      })}
    </div>
  );

  switch (ex.type) {
    case "multiple-choice":
      return (
        <div>
          <h2 className="text-2xl font-extrabold leading-snug">{ex.prompt}</h2>
          {choiceList}
        </div>
      );

    case "fill-blank": {
      const [before, after] = ex.sentence.split("___");
      return (
        <div>
          <h2 className="text-2xl font-extrabold leading-snug">
            {before}
            <span className={cn("mx-1 inline-block min-w-20 border-b-4 px-2 text-center", selected ? "border-ink text-ink" : "border-line text-transparent")}>{selected ?? "____"}</span>
            {after}
          </h2>
          {ex.translation && <p className="mt-2 text-muted">{ex.translation}</p>}
          <div className="mt-4">
            <SpeakButton text={ex.sentence.replace("___", ex.answer)} size="sm" label="Hear the full sentence" />
          </div>
          {choiceList}
        </div>
      );
    }

    case "dialogue":
      return (
        <div>
          <p className="mb-4 text-muted">{ex.context}</p>
          <div className="space-y-3">
            {ex.lines.map((l, i) => {
              const blank = l.text.includes("___");
              const mine = i % 2 === 1;
              return (
                <div key={i} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[85%] rounded-3xl px-4 py-3 text-[16px] font-semibold", mine ? "rounded-br-lg bg-brand" : "rounded-bl-lg bg-white shadow-soft")}>
                    <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-wide opacity-60">{l.speaker}</p>
                    {blank ? <span className={cn("inline-block min-w-24 border-b-4 border-ink/40", selected && "font-bold")}>{selected ?? "\u00A0"}</span> : l.text}
                  </div>
                </div>
              );
            })}
          </div>
          {choiceList}
        </div>
      );

    case "reading":
      return <ReadingBody ex={ex}>{choiceList}</ReadingBody>;

    case "translation":
      return (
        <div>
          <div className="flex items-start gap-3">
            {ex.direction === "en-pt" && <SpeakButton text={ex.prompt} />}
            <h2 className="text-2xl font-extrabold leading-snug">{ex.prompt}</h2>
          </div>
          <p className="mt-2 text-sm text-muted">{ex.direction === "pt-en" ? "Write it in English." : "Write it in Portuguese."} Capital letters, accents and punctuation don&apos;t matter.</p>
          <input
            value={typeof response === "string" ? response : ""}
            onChange={(e) => setResponse(e.target.value)}
            disabled={locked}
            aria-label="Your translation"
            placeholder={ex.direction === "pt-en" ? "Type in English…" : "Digite em português…"}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onSubmitText();
              }
            }}
            className="mt-5 h-14 w-full rounded-2xl border-2 border-line bg-white px-4 text-lg font-semibold outline-none focus:border-ink disabled:opacity-70"
          />
        </div>
      );

    case "word-order":
    case "sentence-construction":
      return <OrderBody ex={ex} response={response} setResponse={setResponse} locked={locked} />;

    case "matching":
      return <MatchBody ex={ex} locked={locked} onDone={onMatchDone} />;

    case "listening":
      return <ListeningBody ex={ex} response={response} setResponse={setResponse} locked={locked} choiceList={choiceList} onSubmitText={onSubmitText} />;
  }
}

function ReadingBody({ ex, children }: { ex: Extract<Exercise, { type: "reading" }>; children: React.ReactNode }) {
  const [pt, setPt] = useState(false);
  return (
    <div>
      <div className="rounded-3xl border border-line bg-white p-5 shadow-soft">
        <p className="text-[17px] leading-relaxed">{ex.passage}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SpeakControls text={ex.passage} size="sm" />
          <button type="button" onClick={() => setPt((v) => !v)} className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-sm font-bold" aria-pressed={pt}>
            <Eye className="size-4" aria-hidden /> {pt ? "Hide" : "Show"} Portuguese
          </button>
        </div>
        {pt && <p className="mt-3 rounded-2xl bg-cream p-3 text-sm text-ink/80">{ex.passagePt}</p>}
      </div>
      <h2 className="mt-6 text-xl font-extrabold">{ex.question}</h2>
      {children}
    </div>
  );
}

function OrderBody({ ex, response, setResponse, locked }: { ex: Extract<Exercise, { type: "word-order" | "sentence-construction" }>; response: Response | null; setResponse: (r: Response | null) => void; locked: boolean }) {
  const tokens = useMemo(() => seededShuffle([...ex.answer.split(" "), ...ex.distractors], ex.id), [ex]);
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => {
    setResponse(picked.length ? picked.map((i) => tokens[i]) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, tokens]);
  void response;

  return (
    <div>
      <h2 className="text-2xl font-extrabold leading-snug">{ex.promptPt}</h2>
      {ex.distractors.length > 0 && <p className="mt-1 text-sm text-muted">Some words are extra — you won&apos;t use them all.</p>}
      <div aria-label="Your sentence" className="mt-5 flex min-h-20 flex-wrap content-start gap-2 border-b-2 border-line pb-3">
        {picked.map((idx, pos) => (
          <button
            key={`${idx}-${pos}`}
            type="button"
            disabled={locked}
            onClick={() => setPicked((p) => p.filter((_, i) => i !== pos))}
            className="rounded-2xl border-2 border-b-4 border-ink bg-brand-soft px-4 py-2.5 text-[16px] font-bold"
            aria-label={`Remove ${tokens[idx]}`}
          >
            {tokens[idx]}
          </button>
        ))}
        {picked.length === 0 && <span className="self-center text-sm text-muted">Tap words below to build the sentence</span>}
      </div>
      <div aria-label="Word bank" className="mt-5 flex flex-wrap gap-2">
        {tokens.map((t, idx) => {
          const used = picked.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              disabled={locked || used}
              onClick={() => setPicked((p) => [...p, idx])}
              className={cn("rounded-2xl border-2 border-b-4 bg-white px-4 py-2.5 text-[16px] font-bold transition-all", used ? "border-transparent bg-ink/5 text-transparent" : "border-line hover:bg-cream")}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchBody({ ex, locked, onDone }: { ex: Extract<Exercise, { type: "matching" }>; locked: boolean; onDone: (mistakes: number, pairs: string[]) => void }) {
  const left = useMemo(() => seededShuffle(ex.pairs.map((p) => p.en), `${ex.id}-l`), [ex]);
  const right = useMemo(() => seededShuffle(ex.pairs.map((p) => p.pt), `${ex.id}-r`), [ex]);
  const [selL, setSelL] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const mistakes = useRef(0);
  const { play } = useSpeaker();

  const pickRight = (pt: string) => {
    if (!selL || locked) return;
    const ok = ex.pairs.some((p) => p.en === selL && p.pt === pt);
    if (ok) {
      const next = [...matched, selL];
      setMatched(next);
      setSelL(null);
      if (next.length === ex.pairs.length) onDone(mistakes.current, ex.pairs.map((p) => `${p.en}::${p.pt}`));
    } else {
      mistakes.current += 1;
      setWrong(pt);
      setTimeout(() => setWrong(null), 500);
    }
  };

  const ptOf = (en: string) => ex.pairs.find((p) => p.en === en)?.pt;
  const matchedPt = new Set(matched.map((m) => ptOf(m)));

  return (
    <div>
      <h2 className="text-2xl font-extrabold">Match each phrase with its meaning</h2>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="grid gap-3">
          {left.map((en) => {
            const done = matched.includes(en);
            return (
              <button
                key={en}
                type="button"
                disabled={done || locked}
                onClick={() => {
                  setSelL(en);
                  void play(en);
                }}
                aria-pressed={selL === en}
                className={cn("rounded-2xl border-2 border-b-4 px-3 py-3.5 text-[15px] font-bold transition-all", done ? "border-success bg-success-soft opacity-60" : selL === en ? "border-ink bg-brand-soft" : "border-line bg-white hover:bg-cream")}
              >
                {en}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3">
          {right.map((pt) => {
            const done = matchedPt.has(pt);
            return (
              <button
                key={pt}
                type="button"
                disabled={done || locked || !selL}
                onClick={() => pickRight(pt)}
                className={cn("rounded-2xl border-2 border-b-4 px-3 py-3.5 text-[15px] font-bold transition-all", done ? "border-success bg-success-soft opacity-60" : wrong === pt ? "border-danger bg-danger-soft" : "border-line bg-white hover:bg-cream disabled:hover:bg-white")}
              >
                {pt}
              </button>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">{selL ? "Now tap the Portuguese meaning." : "Tap an English phrase first — you will hear it."}</p>
    </div>
  );
}

function ListeningBody({ ex, response, setResponse, locked, choiceList, onSubmitText }: { ex: Extract<Exercise, { type: "listening" }>; response: Response | null; setResponse: (r: Response | null) => void; locked: boolean; choiceList: React.ReactNode; onSubmitText: () => void }) {
  const { play } = useSpeaker();
  const [showText, setShowText] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => void play(ex.text), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.id]);
  return (
    <div>
      <h2 className="text-2xl font-extrabold">{ex.mode === "type" ? "Type what you hear" : "What do you hear?"}</h2>
      <div className="mt-5 flex items-center gap-4 rounded-3xl bg-white p-5 shadow-soft">
        <SpeakControls text={ex.text} size="lg" />
        <p className="text-sm text-muted">Play the sentence as many times as you like. The turtle plays it slowly.</p>
      </div>
      <div className="mt-3 space-y-2">
        <SpeechUnavailableNote />
        <button type="button" onClick={() => setShowText((v) => !v)} className="flex items-center gap-1.5 rounded-full bg-cream px-3 py-1.5 text-sm font-bold">
          <Eye className="size-4" aria-hidden /> {showText ? "Hide" : "Can't listen? Show"} transcript
        </button>
        {showText && <p className="rounded-2xl bg-cream p-3 font-semibold">{ex.text}</p>}
      </div>
      {ex.mode === "choose" ? (
        choiceList
      ) : (
        <input
          value={typeof response === "string" ? response : ""}
          onChange={(e) => setResponse(e.target.value)}
          disabled={locked}
          aria-label="Type what you heard"
          placeholder="Type in English…"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              onSubmitText();
            }
          }}
          className="mt-5 h-14 w-full rounded-2xl border-2 border-line bg-white px-4 text-lg font-semibold outline-none focus:border-ink disabled:opacity-70"
        />
      )}
    </div>
  );
}
