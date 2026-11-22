import type { MissionConfig, MissionKind } from "../domain/types";

export type WakeChallenge = {
  id: string;
  kind: MissionKind;
  prompt: string;
  hint: string;
  difficulty: MissionConfig["difficulty"];
};

type ChallengeAnswer = { accepted: string[]; caseSensitive?: boolean };
const normalize = (value: string, caseSensitive = false) => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return caseSensitive ? trimmed : trimmed.toLowerCase();
};
const randomId = () => globalThis.crypto?.randomUUID?.() ?? `challenge-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export class MissionService {
  private answers = new Map<string, ChallengeAnswer>();

  create(config: MissionConfig): WakeChallenge {
    const id = randomId();
    const available: MissionKind[] = ["math", "memory", "sequence", "typing", "logic", "checklist", "movement"];
    const kind = config.kind === "random" ? available[Math.floor(Math.random() * available.length)]! : config.kind;
    const challenge = this.build(id, kind, config.difficulty);
    this.answers.set(id, challenge.answer);
    return { id, kind, prompt: challenge.prompt, hint: challenge.hint, difficulty: config.difficulty };
  }

  check(challengeId: string, response: string): { correct: boolean; message: string } {
    const expected = this.answers.get(challengeId);
    if (!expected) return { correct: false, message: "This challenge has expired. Start a new one." };
    const answer = normalize(response, expected.caseSensitive);
    const correct = expected.accepted.some(item => normalize(item, expected.caseSensitive) === answer);
    if (correct) this.answers.delete(challengeId);
    return { correct, message: correct ? "That's it. You're up." : "Not quite. Give it another try." };
  }

  completeAction(challengeId: string): { completed: boolean } {
    if (!this.answers.has(challengeId)) return { completed: false };
    this.answers.delete(challengeId);
    return { completed: true };
  }

  private build(id: string, kind: MissionKind, difficulty: MissionConfig["difficulty"]): {
    prompt: string; hint: string; answer: ChallengeAnswer
  } {
    const scale = difficulty === "easy" ? 10 : difficulty === "medium" ? 30 : 100;
    if (kind === "math") {
      const a = 2 + Math.floor(Math.random() * scale);
      const b = 1 + Math.floor(Math.random() * scale);
      const subtract = Math.random() > 0.5;
      const left = subtract ? Math.max(a, b) : a;
      const right = subtract ? Math.min(a, b) : b;
      const answer = subtract ? left - right : left + right;
      return { prompt: `Quick one: ${left} ${subtract ? "−" : "+"} ${right} = ?`, hint: "Take it one step at a time.", answer: { accepted: [String(answer)] } };
    }
    if (kind === "sequence" || kind === "logic") {
      const start = 1 + Math.floor(Math.random() * 8);
      const step = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 5;
      const values = [start, start + step, start + step * 2, start + step * 3];
      return { prompt: `Find the next number: ${values.join(", ")}, ?`, hint: `Look at how much each number changes.`, answer: { accepted: [String(start + step * 4)] } };
    }
    if (kind === "memory") {
      const length = difficulty === "easy" ? 3 : difficulty === "medium" ? 4 : 5;
      const digits = Array.from({ length }, () => String(Math.floor(Math.random() * 9) + 1));
      return { prompt: `Memorise this sequence: ${digits.join("  ")}. Then type it below.`, hint: "Read the digits from left to right.", answer: { accepted: [digits.join("")] } };
    }
    if (kind === "typing") {
      const phrase = difficulty === "hard" ? "I am awake and ready to begin." : difficulty === "medium" ? "Today starts now." : "I am up.";
      return { prompt: `Type this exactly: “${phrase}”`, hint: "Capitalisation and punctuation matter less than the words.", answer: { accepted: [phrase] } };
    }
    if (kind === "movement") {
      return { prompt: "Stand up, get comfortable, and take a few gentle steps. Tap complete when you're ready.", hint: "Keep it comfortable. You can choose another mission if movement doesn't work for you.", answer: { accepted: ["complete"] } };
    }
    if (kind === "checklist") {
      return { prompt: "A tiny reset: sit up, switch on a light, and get a glass of water if you want one. Tap complete when ready.", hint: "You can skip any step that doesn't suit you.", answer: { accepted: ["complete"] } };
    }
    return { prompt: "Type UP to finish this wake-up check.", hint: "Just the two letters.", answer: { accepted: ["up"] } };
  }
}
