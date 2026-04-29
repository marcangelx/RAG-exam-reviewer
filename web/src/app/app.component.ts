import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from "@angular/core";
import { FormsModule } from "@angular/forms";

import {
  AppTab,
  CertificationProfile,
  ExamJob,
  ExamQuestion,
  ExamResult,
  KnowledgeAsset,
  QuestionInteraction,
  QuestionType,
  RetryAction,
  RuntimeConfig,
  WorkflowStep,
} from "./app.models";
import { AuthService } from "./auth.service";
import { ExamApiService } from "./exam-api.service";
import { ReviewSessionService } from "./review-session.service";
import { WorkspaceDataService } from "./workspace-data.service";

@Component({
  selector: "app-root",
  imports: [FormsModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ExamApiService);
  private readonly workspace = inject(WorkspaceDataService);
  private readonly review = inject(ReviewSessionService);
  private readonly cdr = inject(ChangeDetectorRef);

  activeTab: AppTab = "sources";
  status = "Loading";
  busy = false;
  errorMessage = "";
  retryLabel = "";
  activity: string[] = ["Ready to add sources."];
  selectedFile: File | null = null;
  historyFilter = "ALL";

  textTitle = "";
  knowledgeText = "";
  selectedProfileId = "";
  certificationName = "General Certification Prep";
  questionCount = 5;
  typeMcq = true;
  typeFib = true;
  typeTrick = true;
  includeDistractors = true;

  private retryAction: RetryAction = null;

  get config(): RuntimeConfig | null {
    return this.auth.config();
  }

  get isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }

  get technicalDetails(): string {
    return this.api.technicalDetails();
  }

  get assets(): KnowledgeAsset[] {
    return this.workspace.assets();
  }

  get readyAssets(): KnowledgeAsset[] {
    return this.workspace.readyAssets();
  }

  get pendingAssets(): KnowledgeAsset[] {
    return this.workspace.pendingAssets();
  }

  get selectedAssets(): KnowledgeAsset[] {
    return this.workspace.selectedAssets();
  }

  get selectedSourceIds(): Set<string> {
    return this.workspace.selectedSourceIds();
  }

  get profiles(): CertificationProfile[] {
    return this.workspace.profiles();
  }

  get jobs(): ExamJob[] {
    return this.workspace.jobs();
  }

  get filteredJobs(): ExamJob[] {
    if (this.historyFilter === "ALL") {
      return this.jobs;
    }
    return this.jobs.filter((job) => job.status === this.historyFilter);
  }

  get result(): ExamResult | null {
    return this.review.result();
  }

  get interactions(): QuestionInteraction[] {
    return this.review.interactions();
  }

  get currentQuestionIndex(): number {
    return this.review.currentQuestionIndex();
  }

  get currentQuestion(): ExamQuestion | null {
    return this.review.currentQuestion();
  }

  get reviewTotal(): number {
    return this.review.reviewTotal();
  }

  get reviewProgressLabel(): string {
    return this.review.reviewProgressLabel();
  }

  get reviewProgressPercent(): number {
    return this.review.reviewProgressPercent();
  }

  get currentQuestionAnswered(): boolean {
    return this.review.currentQuestionAnswered();
  }

  get currentQuestionRevealed(): boolean {
    return this.review.currentQuestionRevealed();
  }

  get answeredCount(): number {
    return this.review.answeredCount();
  }

  get revealedCount(): number {
    return this.review.revealedCount();
  }

  get hasEnoughText(): boolean {
    return this.knowledgeText.trim().length >= 20;
  }

  get canGenerateExam(): boolean {
    return Boolean(this.selectedAssets.length && !this.busy);
  }

  get workflowSteps(): WorkflowStep[] {
    const hasReadySource = this.readyAssets.length > 0;
    const hasResult = Boolean(this.result?.questions.length);
    const hasHistory = this.jobs.length > 0;
    const completedGeneration = hasResult || this.jobs.some((job) => job.status === "COMPLETED");

    const steps: Array<Omit<WorkflowStep, "state"> & { complete: boolean }> = [
      {
        index: 1,
        label: "Sources",
        detail: hasReadySource ? `${this.readyAssets.length} ready` : "Add material",
        tab: "sources",
        complete: hasReadySource,
      },
      {
        index: 2,
        label: "Generate",
        detail: this.selectedAssets.length ? `${this.selectedAssets.length} selected` : "Select sources",
        tab: "generate",
        complete: completedGeneration,
      },
      {
        index: 3,
        label: "Review",
        detail: hasResult ? `${this.result?.questions.length || 0} questions` : "Open results",
        tab: "review",
        complete: hasResult && this.revealedCount > 0,
      },
      {
        index: 4,
        label: "History",
        detail: hasHistory ? `${this.jobs.length} saved` : "Saved exams",
        tab: "history",
        complete: hasHistory,
      },
    ];

    return steps.map((step) => ({
      ...step,
      state: this.activeTab === step.tab ? "current" : step.complete ? "done" : "upcoming",
    }));
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.auth.initialize();
      this.workspace.loadStoredSelection();

      if (this.isAuthenticated) {
        await this.loadInitialData();
      } else {
        this.setStatus("Sign in required");
      }
    } catch (error) {
      this.handleError(error, "Refresh app", async () => this.ngOnInit());
    }
  }

  sourceTypeLabel(sourceType: string): string {
    return sourceType === "FILE" ? "File" : "Text";
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      UPLOADED: "Uploaded",
      PROCESSING: "Preparing",
      READY: "Ready",
      FAILED: "Failed",
      QUEUED: "Queued",
      RUNNING: "Generating",
      COMPLETED: "Complete",
    };
    return labels[status] || status;
  }

  questionTypeLabel(type: QuestionType): string {
    const labels: Record<QuestionType, string> = {
      MULTIPLE_CHOICE: "Multiple choice",
      FILL_IN_THE_BLANK: "Fill in the blank",
      TRICK: "Trick question",
    };
    return labels[type];
  }

  formatDate(value?: string): string {
    if (!value) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  async signIn(): Promise<void> {
    await this.withBusy("Opening secure sign-in", async () => this.auth.signIn(), "Try sign-in again", async () => this.signIn());
  }

  signOut(): void {
    this.auth.signOut();
  }

  setTab(tab: AppTab): void {
    this.activeTab = tab;
    this.cdr.markForCheck();
  }

  async refreshAll(): Promise<void> {
    await this.withBusy("Refreshing sources and history", async () => {
      await this.workspace.loadInitialData();
      this.applyDefaultProfile();
      this.addActivity("Sources, history, and exam presets are up to date.");
    }, "Try refresh again", async () => this.refreshAll());
  }

  async saveTextSource(): Promise<void> {
    const text = this.knowledgeText.trim();
    if (text.length < 20) {
      this.setError("Paste at least a few sentences so the app has enough material to create useful questions.");
      return;
    }

    await this.withBusy("Saving source", async () => {
      await this.workspace.saveTextSource(this.textTitle.trim(), text);
      this.textTitle = "";
      this.knowledgeText = "";
      this.addActivity("Text source is ready to use.");
      this.setTab("generate");
    }, "Try saving again", async () => this.saveTextSource());
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
    this.clearError();
  }

  async uploadFileSource(): Promise<void> {
    if (!this.selectedFile) {
      this.setError("Choose a PDF, TXT, or DOCX file before uploading.");
      return;
    }

    const file = this.selectedFile;
    if (!this.isSupportedFile(file)) {
      this.setError("This file type is not supported. Upload a PDF, TXT, or DOCX file.");
      return;
    }

    await this.withBusy("Uploading source", async () => {
      const presign = await this.workspace.createPresignedUpload(file);
      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed. Try the file again, or choose a smaller supported file.");
      }

      this.addActivity(`Uploaded ${file.name}. Preparing it for exam generation.`);
      await this.pollKnowledge(presign.documentId);
    }, "Try upload again", async () => this.uploadFileSource());
  }

  toggleSource(asset: KnowledgeAsset): void {
    try {
      this.clearError();
      this.workspace.toggleSource(asset);
    } catch (error) {
      this.handleError(error);
    }
  }

  clearLocalSources(): void {
    this.clearError();
    this.workspace.clearLocalSources();
    this.addActivity("Cleared the source list in this browser. Uploaded files remain saved.");
  }

  applyProfile(): void {
    const profile = this.profiles.find((item) => item.id === this.selectedProfileId);
    if (!profile) {
      return;
    }

    this.certificationName = profile.name;
    this.questionCount = profile.questionCount;
    this.typeMcq = profile.questionTypes.includes("MULTIPLE_CHOICE");
    this.typeFib = profile.questionTypes.includes("FILL_IN_THE_BLANK");
    this.typeTrick = profile.questionTypes.includes("TRICK");
    this.includeDistractors = profile.includeDistractors;
  }

  async createExamJob(): Promise<void> {
    const sourceAssetIds = this.selectedAssets.map((asset) => asset.id);
    if (!sourceAssetIds.length) {
      this.setError("Select at least one ready source before generating an exam.");
      this.setTab("sources");
      return;
    }

    const questionTypes = this.selectedQuestionTypes();
    if (!questionTypes.length) {
      this.setError("Choose at least one question format in Customize question details.");
      return;
    }

    const normalizedCount = Math.trunc(Number(this.questionCount));
    if (!Number.isFinite(normalizedCount) || normalizedCount < 1 || normalizedCount > 25) {
      this.setError("Question count must be between 1 and 25.");
      return;
    }
    this.questionCount = normalizedCount;

    await this.withBusy("Starting exam generation", async () => {
      const job = await this.workspace.createExamJob({
        sourceAssetIds,
        certificationName: this.certificationName,
        questionCount: this.questionCount,
        questionTypes,
        includeDistractors: this.includeDistractors,
      });
      this.addActivity("Exam generation started. This can take a short moment.");
      await this.pollJob(job.id);
      await this.workspace.loadJobs();
    }, "Try generating again", async () => this.createExamJob());
  }

  async openJob(jobId: string): Promise<void> {
    await this.withBusy("Opening saved exam", async () => {
      const payload = await this.workspace.getExamJob(jobId);
      if (payload.result) {
        this.review.setResult(payload.result);
        this.setTab("review");
      }
      this.api.setTechnicalDetails(payload);
    }, "Try opening again", async () => this.openJob(jobId));
  }

  async retryLastAction(): Promise<void> {
    const action = this.retryAction;
    if (!action || this.busy) {
      return;
    }
    await action();
  }

  clearError(): void {
    this.errorMessage = "";
    this.retryLabel = "";
    this.retryAction = null;
    this.cdr.markForCheck();
  }

  selectChoice(index: number, choice: string): void {
    this.review.selectChoice(index, choice);
  }

  setHint(index: number, event: Event): void {
    this.review.setHint(index, (event.target as HTMLDetailsElement).open);
  }

  toggleAnswer(index: number): void {
    this.review.toggleAnswer(index);
  }

  resetQuestion(index: number): void {
    this.review.resetQuestion(index);
  }

  setReviewQuestion(index: number): void {
    this.review.setQuestion(index);
  }

  previousQuestion(): void {
    this.review.previousQuestion();
  }

  nextQuestion(): void {
    this.review.nextQuestion();
  }

  isSelectedAnswer(index: number, choice: string): boolean {
    return this.review.isSelectedAnswer(index, choice);
  }

  isCorrectChoice(question: ExamQuestion, choice: string): boolean {
    return this.review.isCorrectChoice(question, choice);
  }

  isIncorrectSelection(index: number, question: ExamQuestion, choice: string): boolean {
    return this.review.isIncorrectSelection(index, question, choice);
  }

  private async loadInitialData(): Promise<void> {
    await this.withBusy("Loading workspace", async () => {
      await this.workspace.loadInitialData();
      this.applyDefaultProfile();
      this.setStatus("Ready");
    }, "Try loading again", async () => this.loadInitialData());
  }

  private applyDefaultProfile(): void {
    if (!this.selectedProfileId && this.profiles.length) {
      this.selectedProfileId = this.profiles[0].id;
      this.applyProfile();
    }
  }

  private async pollKnowledge(documentId: string): Promise<void> {
    for (let attempt = 1; attempt <= 90; attempt += 1) {
      const asset = await this.workspace.getKnowledge(documentId);

      if (asset.status === "READY") {
        this.workspace.selectSource(asset.id);
        this.addActivity("Source is ready to use.");
        this.setTab("generate");
        return;
      }

      if (asset.status === "FAILED") {
        throw new Error(asset.error || "We could not prepare this source. Try another file or paste the text instead.");
      }

      await this.delay(2000);
    }

    throw new Error("Preparing this source took too long. Refresh sources in a moment to check again.");
  }

  private async pollJob(jobId: string): Promise<void> {
    for (let attempt = 1; attempt <= 60; attempt += 1) {
      const payload = await this.workspace.getExamJob(jobId);
      if (payload.job.status === "COMPLETED" && payload.result) {
        this.review.setResult(payload.result);
        this.addActivity("Exam is ready for review.");
        this.setTab("review");
        return;
      }

      if (payload.job.status === "FAILED") {
        throw new Error(payload.job.error || "Exam generation failed. Try fewer questions or a smaller source set.");
      }

      await this.delay(2500);
    }

    throw new Error("Exam generation is taking longer than expected. Check History again in a moment.");
  }

  private selectedQuestionTypes(): QuestionType[] {
    const types: QuestionType[] = [];
    if (this.typeMcq) {
      types.push("MULTIPLE_CHOICE");
    }
    if (this.typeFib) {
      types.push("FILL_IN_THE_BLANK");
    }
    if (this.typeTrick) {
      types.push("TRICK");
    }
    return types;
  }

  private async withBusy(label: string, action: () => Promise<void>, retryLabel = "", retryAction: RetryAction = null): Promise<void> {
    this.busy = true;
    this.clearError();
    this.setStatus(label);
    try {
      await action();
      if (this.isAuthenticated) {
        this.setStatus("Ready");
      }
    } catch (error) {
      this.handleError(error, retryLabel, retryAction);
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  private setStatus(message: string): void {
    this.status = message;
    this.cdr.markForCheck();
  }

  private setError(message: string, retryLabel = "", retryAction: RetryAction = null): void {
    this.errorMessage = message;
    this.retryLabel = retryLabel;
    this.retryAction = retryAction;
    this.setStatus(message);
  }

  private handleError(error: unknown, retryLabel = "", retryAction: RetryAction = null): void {
    const message = error instanceof Error ? error.message : String(error);
    this.setError(message, retryLabel, retryAction);
    this.addActivity(message);
    this.api.setTechnicalDetails({ error: message });
  }

  private addActivity(message: string): void {
    this.activity = [message, ...this.activity].slice(0, 8);
    this.cdr.markForCheck();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  private isSupportedFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith(".pdf") || name.endsWith(".txt") || name.endsWith(".docx");
  }
}
