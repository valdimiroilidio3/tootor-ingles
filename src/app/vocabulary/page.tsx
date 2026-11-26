"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { useReadyApp } from "@/components/AppProvider";
import { SpeakButton } from "@/components/Speech";
import { Button, Card, EmptyState, LinkButton, Notice, PageHeader, Pill } from "@/components/ui";
import { familiarityLabel, isDifficult, isDue, isLearned, isNew } from "@/lib/srs";
import type { VocabItem } from "@/lib/types";
import { cn, formatDate } from "@/lib/util";

type Filter = "all" | "new" | "due" | "difficult" | "mastered";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "due", label: "Due" },
  { id: "difficult", label: "Difficult" },
  { id: "mastered", label: "Learned" },
];

const matches = (v: VocabItem, f: Filter) =>
  f === "all" ? true : f === "new" ? isNew(v) : f === "due" ? isDue(v) : f === "difficult" ? isDifficult(v) : isLearned(v);

export default function VocabularyPage() {
  const { data, addVocab, removeVocab } = useReadyApp();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ word: "", translation: "", example: "", exampleTranslation: "", context: "" });
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.vocab
      .filter((v) => matches(v, filter))
      .filter((v) => !q || v.word.toLowerCase().includes(q) || v.translation.toLowerCase().includes(q))
      .sort((a, b) => a.word.localeCompare(b.word));
  }, [data.vocab, query, filter]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdded(null);
    if (!form.word.trim() || !form.translation.trim()) {
      setError("Please enter both the English word or phrase and its Portuguese translation.");
      return;
    }
    const item = await addVocab(form, "manual");
    if (!item) {
      setError(`“${form.word.trim()}” is already in your notebook.`);
      return;
    }
    setAdded(item.word);
    setForm({ word: "", translation: "", example: "", exampleTranslation: "", context: "" });
  };

  const field = "h-11 w-full rounded-2xl border border-line bg-white px-4 text-[15px] outline-none focus:border-ink";
  const dueCount = data.vocab.filter((v) => isDue(v)).length;

  return (
    <div>
      <PageHeader
        title="Vocabulary"
        subtitle={`${data.vocab.length} ${data.vocab.length === 1 ? "word" : "words"} in your personal notebook · ${data.vocab.filter(isLearned).length} learned`}
        action={
          <div className="flex gap-2">
            {dueCount > 0 && <LinkButton href="/review" variant="secondary">Review {dueCount}</LinkButton>}
            <Button onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              <Plus className="size-4" aria-hidden /> Add word
            </Button>
          </div>
        }
      />

      {open && (
        <Card className="mb-6">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
            <label className="text-sm font-bold">
              English word or phrase *
              <input className={cn(field, "mt-1 font-normal")} value={form.word} onChange={(e) => setForm({ ...form, word: e.target.value })} placeholder="e.g. look forward to" />
            </label>
            <label className="text-sm font-bold">
              Portuguese translation *
              <input className={cn(field, "mt-1 font-normal")} value={form.translation} onChange={(e) => setForm({ ...form, translation: e.target.value })} placeholder="e.g. aguardar com expectativa" />
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              Example sentence
              <input className={cn(field, "mt-1 font-normal")} value={form.example} onChange={(e) => setForm({ ...form, example: e.target.value })} placeholder="I look forward to meeting you." />
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              Context (where you heard or will use it)
              <input className={cn(field, "mt-1 font-normal")} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} placeholder="Work emails" />
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Button type="submit">Save word</Button>
              <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
              {added && <span role="status" className="text-sm font-bold text-[#1d6b3c]">Added “{added}”</span>}
            </div>
            {error && <div className="sm:col-span-2"><Notice tone="danger">{error}</Notice></div>}
          </form>
        </Card>
      )}

      {data.vocab.length === 0 ? (
        <EmptyState
          icon="📚"
          title="Your notebook is empty"
          text="Words from completed lessons are added automatically. You can also add your own words and phrases."
          action={<Button onClick={() => setOpen(true)}><Plus className="size-4" aria-hidden /> Add your first word</Button>}
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search words or translations" aria-label="Search vocabulary" className={cn(field, "pl-11")} />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter">
              {FILTERS.map((f) => (
                <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={cn("rounded-full border px-4 py-2 text-sm font-bold", filter === f.id ? "border-ink bg-ink text-white" : "border-line bg-white")}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {list.length === 0 ? (
            <EmptyState icon="🔍" title="No matching words" text="Try a different search or filter." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {list.map((v) => (
                <li key={v.id} className="rounded-3xl border border-line bg-white p-4 shadow-soft">
                  <div className="flex items-start gap-3">
                    <SpeakButton text={v.word} size="sm" label={`Play ${v.word}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-extrabold leading-tight">{v.word}</p>
                      <p className="text-[15px] text-muted">{v.translation}</p>
                    </div>
                    <button
                      aria-label={`Delete ${v.word}`}
                      onClick={() => {
                        if (window.confirm(`Delete “${v.word}” from your notebook?`)) void removeVocab(v.id);
                      }}
                      className="grid size-9 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {v.example && <p className="mt-3 text-sm">“{v.example}”{v.exampleTranslation && <span className="block text-muted">{v.exampleTranslation}</span>}</p>}
                  {v.context && <p className="mt-1 text-xs text-muted">Context: {v.context}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Pill tone={isLearned(v) ? "success" : isNew(v) ? "brand" : "neutral"}>{familiarityLabel(v.familiarity)}</Pill>
                    {isDue(v) && <Pill tone="danger">Due</Pill>}
                    {isDifficult(v) && <Pill tone="danger">Often missed</Pill>}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted">
                    <dt>Last reviewed</dt><dd className="text-right font-bold text-ink">{formatDate(v.lastReviewed)}</dd>
                    <dt>Next review</dt><dd className="text-right font-bold text-ink">{formatDate(v.nextReview)}</dd>
                    <dt>Correct / incorrect</dt><dd className="text-right font-bold text-ink">{v.correct} / {v.incorrect}</dd>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
