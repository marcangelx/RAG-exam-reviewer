import { Injectable, computed, signal } from "@angular/core";

import { ExamQuestion, ExamResult, QuestionInteraction } from "./app.models";

@Injectable({ providedIn: "root" })
export class ReviewSessionService {
  readonly result = signal<ExamResult | null>(null);
  readonly interactions = signal<QuestionInteraction[]>([]);
  readonly currentQuestionIndex = signal(0);
  readonly currentQuestion = computed(() => {
    const result = this.result();
    if (!result?.questions.length) {
      return null;
    }
    return result.questions[this.safeQuestionIndex(this.currentQuestionIndex())] || null;
  });
  readonly reviewTotal = computed(() => this.result()?.questions.length || 0);
  readonly reviewProgressLabel = computed(() => {
    const total = this.reviewTotal();
    if (!total) {
      return "No exam loaded";
    }
    return `Question ${this.safeQuestionIndex(this.currentQuestionIndex()) + 1} of ${total}`;
  });
  readonly reviewProgressPercent = computed(() => {
    const total = this.reviewTotal();
    if (!total) {
      return 0;
    }
    return Math.round(((this.safeQuestionIndex(this.currentQuestionIndex()) + 1) / total) * 100);
  });
  readonly currentQuestionAnswered = computed(() => Boolean(this.interactions()[this.currentQuestionIndex()]?.selectedChoice));
  readonly currentQuestionRevealed = computed(() => Boolean(this.interactions()[this.currentQuestionIndex()]?.showAnswer));
  readonly answeredCount = computed(() => this.interactions().filter((interaction) => Boolean(interaction.selectedChoice)).length);
  readonly revealedCount = computed(() => this.interactions().filter((interaction) => interaction.showAnswer).length);

  setResult(result: ExamResult): void {
    this.result.set(result);
    this.currentQuestionIndex.set(0);
    this.interactions.set(result.questions.map(() => ({
      selectedChoice: null,
      showHint: false,
      showAnswer: false,
    })));
  }

  selectChoice(index: number, choice: string): void {
    this.updateInteraction(index, { selectedChoice: choice });
  }

  setHint(index: number, open: boolean): void {
    this.updateInteraction(index, { showHint: open });
  }

  toggleAnswer(index: number): void {
    const current = this.interactions()[index];
    this.updateInteraction(index, { showAnswer: !current?.showAnswer });
  }

  resetQuestion(index: number): void {
    this.updateInteraction(index, {
      selectedChoice: null,
      showHint: false,
      showAnswer: false,
    });
  }

  setQuestion(index: number): void {
    this.currentQuestionIndex.set(this.safeQuestionIndex(index));
  }

  previousQuestion(): void {
    this.setQuestion(this.currentQuestionIndex() - 1);
  }

  nextQuestion(): void {
    this.setQuestion(this.currentQuestionIndex() + 1);
  }

  isSelectedAnswer(index: number, choice: string): boolean {
    return this.interactions()[index]?.selectedChoice === choice;
  }

  isCorrectChoice(question: ExamQuestion, choice: string): boolean {
    return question.correctAnswer.trim().toLowerCase() === choice.trim().toLowerCase();
  }

  isIncorrectSelection(index: number, question: ExamQuestion, choice: string): boolean {
    const interaction = this.interactions()[index];
    return Boolean(interaction?.showAnswer && interaction.selectedChoice === choice && !this.isCorrectChoice(question, choice));
  }

  private updateInteraction(index: number, patch: Partial<QuestionInteraction>): void {
    this.interactions.update((items) => items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  private safeQuestionIndex(index: number): number {
    const total = this.result()?.questions.length || 0;
    if (!total) {
      return 0;
    }
    return Math.min(Math.max(index, 0), total - 1);
  }
}
