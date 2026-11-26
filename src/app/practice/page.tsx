"use client";

import { useState } from "react";
import { BookmarkPlus, ChevronDown, MessageCircle } from "lucide-react";
import { useReadyApp } from "@/components/AppProvider";
import { SpeakButton, SpeechHelp, SpeechPractice } from "@/components/Speech";
import { Button, Card, LinkButton, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { SCENARIOS } from "@/content/scenarios";
import { cn } from "@/lib/util";

export default function PracticePage() {
  const { addVocab } = useReadyApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [target, setTarget] = useState<{ en: string; pt: string } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const savePhrases = async (id: string) => {
    const sc = SCENARIOS.find((s) => s.id === id);
    if (!sc) return;
    let n = 0;
    for (const p of sc.phrases) {
      const item = await addVocab({ word: p.en, translation: p.pt, context: sc.title }, "tutor");
      if (item) n++;
    }
    setSaved(n > 0 ? `Saved ${n} new ${n === 1 ? "phrase" : "phrases"} from “${sc.title}”.` : "All of these phrases are already in your notebook.");
  };

  return (
    <div className="space-y-10">
      <PageHeader title="Practice" subtitle="Real-life scenarios, key phrases and pronunciation practice." />

      <section aria-label="Scenarios">
        <SectionTitle>Real-life scenarios</SectionTitle>
        <p className="mb-4 text-sm text-muted">Learn the key phrases, then role-play the situation with your tutor — it works offline.</p>
        {saved && <p role="status" className="mb-3 rounded-2xl bg-success-soft p-3 text-sm font-bold text-[#1d6b3c]">{saved}</p>}
        <ul className="grid gap-4 md:grid-cols-2">
          {SCENARIOS.map((s) => {
            const open = openId === s.id;
            return (
              <li key={s.id}>
                <Card className="h-full">
                  <div className="flex items-start gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-2xl" aria-hidden>{s.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-extrabold leading-tight">{s.title}</p>
                      <p className="text-sm text-muted">{s.titlePt} · {s.description}</p>
                      <Pill className="mt-2">{s.level}</Pill>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <LinkButton href={`/tutor?scenario=${s.id}`} size="sm"><MessageCircle className="size-4" aria-hidden /> Role-play</LinkButton>
                    <Button size="sm" variant="secondary" onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open}>
                      Key phrases <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
                    </Button>
                  </div>
                  {open && (
                    <div className="mt-4">
                      <ul className="grid gap-2">
                        {s.phrases.map((p) => (
                          <li key={p.en} className="flex items-center gap-2 rounded-2xl bg-cream p-3">
                            <SpeakButton text={p.en} size="sm" label={`Play: ${p.en}`} />
                            <button onClick={() => { setTarget(p); document.getElementById("pronunciation")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }} className="min-w-0 flex-1 text-left" aria-label={`Practise pronouncing: ${p.en}`}>
                              <span className="block text-[15px] font-bold">{p.en}</span>
                              <span className="block text-xs text-muted">{p.pt}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <Button size="sm" variant="ghost" className="mt-2" onClick={() => void savePhrases(s.id)}><BookmarkPlus className="size-4" aria-hidden /> Save phrases to vocabulary</Button>
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="pronunciation" aria-label="Pronunciation practice" className="scroll-mt-6">
        <SectionTitle>Pronunciation practice</SectionTitle>
        <Card className="space-y-4">
          {target ? (
            <SpeechPractice key={target.en} target={target.en} translation={target.pt} />
          ) : (
            <p className="text-sm text-muted">Open “Key phrases” on any scenario above and tap a phrase to practise saying it here. Or pick one:</p>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose a phrase">
            {SCENARIOS.flatMap((s) => s.phrases.slice(0, 2)).map((p) => (
              <button key={p.en} onClick={() => setTarget(p)} aria-pressed={target?.en === p.en} className={cn("rounded-full border px-3 py-1.5 text-sm font-bold", target?.en === p.en ? "border-ink bg-ink text-white" : "border-line bg-white hover:bg-cream")}>
                {p.en}
              </button>
            ))}
          </div>
          <SpeechHelp />
        </Card>
      </section>
    </div>
  );
}
