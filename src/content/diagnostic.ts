import type { Cefr, Exercise } from "@/lib/types";

export interface DiagnosticQuestion {
  cefr: Cefr;
  exercise: Exercise;
}

const q = (
  cefr: Cefr,
  n: number,
  type: "multiple-choice" | "fill-blank",
  text: string,
  answer: string,
  wrong: string[],
  explanation: string,
): DiagnosticQuestion => ({
  cefr,
  exercise:
    type === "multiple-choice"
      ? { id: `diag-${n}`, type, category: "vocabulary", prompt: text, options: [answer, ...wrong], answer, explanation }
      : { id: `diag-${n}`, type, category: "grammar", sentence: text, translation: "", options: [answer, ...wrong], answer, explanation },
});

/** 10 quick questions: 4 × A1, 3 × A2, 3 × B1. Used only to suggest a starting point. */
export const DIAGNOSTIC: DiagnosticQuestion[] = [
  q("A1", 1, "multiple-choice", "What does “Good morning” mean?", "Bom dia", ["Boa noite", "Tchau", "Obrigado"], "“Good morning” = Bom dia."),
  q("A1", 2, "fill-blank", "I ___ a student.", "am", ["is", "are", "be"], "Com “I” usamos “am”."),
  q("A1", 3, "fill-blank", "She ___ my sister.", "is", ["am", "are", "be"], "Com “she” usamos “is”."),
  q("A1", 4, "multiple-choice", "Which question asks someone's age?", "How old are you?", ["How much are you?", "Where are you?", "What are you old?"], "“How old are you?” pergunta a idade."),
  q("A2", 5, "fill-blank", "Yesterday I ___ to the market.", "went", ["go", "goes", "gone"], "Passado de go = went."),
  q("A2", 6, "fill-blank", "I am ___ to travel next week.", "going", ["go", "went", "gone"], "Planos: am going to + verbo."),
  q("A2", 7, "multiple-choice", "“Can I see your passport?” is said at the…", "airport", ["bakery", "cinema", "gym"], "Passaporte é pedido no aeroporto."),
  q("B1", 8, "fill-blank", "Have you ever ___ to London?", "been", ["be", "was", "being"], "Present perfect: have + been."),
  q("B1", 9, "multiple-choice", "To “postpone” a meeting means to…", "move it to a later time", ["cancel it forever", "start it early", "record it"], "Postpone = adiar."),
  q("B1", 10, "fill-blank", "If it rains tomorrow, we ___ stay at home.", "will", ["would have", "are", "did"], "Primeira condicional: if + presente, will + verbo."),
];
