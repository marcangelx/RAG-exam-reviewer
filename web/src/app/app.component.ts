import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";

type AppTab = "sources" | "generate" | "review" | "history";
type QuestionType = "MULTIPLE_CHOICE" | "FILL_IN_THE_BLANK" | "TRICK";

interface RuntimeConfig {
  apiBaseUrl: string;
  cognitoDomain: string;
  cognitoClientId: string;
  redirectUri: string;
  logoutUri: string;
}

interface TokenSet {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface KnowledgeAsset {
  id: string;
  title?: string;
  fileName?: string;
  sourceType: string;
  fileType?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  error?: string | null;
}

interface CertificationProfile {
  id: string;
  name: string;
  questionCount: number;
  questionTypes: QuestionType[];
  includeDistractors: boolean;
}

interface ExamJob {
  id: string;
  status: string;
  certificationName: string;
  questionCount: number;
  questionTypes: QuestionType[];
  includeDistractors: boolean;
  sourceAssetIds: string[];
  resultAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
  error?: string | null;
}

interface ExamQuestion {
  type: QuestionType;
  prompt: string;
  choices: string[];
  hint: string;
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  sourceEvidence: string[];
}

interface ExamResult {
  examTitle: string;
  questions: ExamQuestion[];
}

interface QuestionInteraction {
  selectedChoice: string | null;
  showHint: boolean;
  showAnswer: boolean;
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
})
export class AppComponent implements OnInit {
  config: RuntimeConfig | null = null;
  tokens: TokenSet | null = null;
  activeTab: AppTab = "sources";
  status = "Loading";
  busy = false;
  technicalDetails = "No API activity yet.";
  activity: string[] = ["Ready for Phase 2 user-scoped workflows."];

  assets: KnowledgeAsset[] = [];
  selectedSourceIds = new Set<string>();
  profiles: CertificationProfile[] = [];
  jobs: ExamJob[] = [];
  result: ExamResult | null = null;
  interactions: QuestionInteraction[] = [];
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

  get isAuthenticated(): boolean {
    return Boolean(this.tokens?.accessToken) && !this.isTokenExpired();
  }

  get readyAssets(): KnowledgeAsset[] {
    return this.assets.filter((asset) => asset.status === "READY");
  }

  get selectedAssets(): KnowledgeAsset[] {
    return this.readyAssets.filter((asset) => this.selectedSourceIds.has(asset.id));
  }

  get filteredJobs(): ExamJob[] {
    if (this.historyFilter === "ALL") {
      return this.jobs;
    }
    return this.jobs.filter((job) => job.status === this.historyFilter);
  }

  async ngOnInit(): Promise<void> {
    await this.loadConfig();
    await this.completeHostedUiSignIn();
    this.loadStoredSession();
    this.loadStoredSelection();

    if (this.isAuthenticated) {
      await this.loadInitialData();
    } else {
      this.status = "Sign in required";
    }
  }

  async signIn(): Promise<void> {
    if (!this.config) {
      this.setStatus("Missing runtime config");
      return;
    }

    const verifier = this.createRandomString();
    const challenge = await this.createCodeChallenge(verifier);
    const state = this.createRandomString();
    localStorage.setItem("exam-prep-pkce-verifier", verifier);
    localStorage.setItem("exam-prep-oauth-state", state);

    const params = new URLSearchParams({
      client_id: this.config.cognitoClientId,
      response_type: "code",
      scope: "openid email profile",
      redirect_uri: this.redirectUri(),
      code_challenge_method: "S256",
      code_challenge: challenge,
      state,
    });

    window.location.assign(`${this.authDomain()}/oauth2/authorize?${params.toString()}`);
  }

  signOut(): void {
    if (!this.config) {
      this.clearSession();
      return;
    }

    this.clearSession();
    const params = new URLSearchParams({
      client_id: this.config.cognitoClientId,
      logout_uri: this.logoutUri(),
    });
    window.location.assign(`${this.authDomain()}/logout?${params.toString()}`);
  }

  setTab(tab: AppTab): void {
    this.activeTab = tab;
  }

  async refreshAll(): Promise<void> {
    await this.withBusy("Refreshing", async () => {
      await Promise.all([this.loadAssets(), this.loadJobs(), this.loadProfiles()]);
      this.addActivity("Refreshed sources, history, and profiles.");
    });
  }

  async saveTextSource(): Promise<void> {
    await this.withBusy("Saving text source", async () => {
      const payload = await this.apiFetch<{ documentId: string; asset: KnowledgeAsset }>("/knowledge/text", {
        method: "POST",
        body: JSON.stringify({
          title: this.textTitle,
          text: this.knowledgeText,
        }),
      });
      this.upsertAsset(payload.asset);
      this.selectedSourceIds.add(payload.asset.id);
      this.persistSelection();
      this.textTitle = "";
      this.knowledgeText = "";
      this.addActivity(`Text source ${payload.documentId} is ready.`);
      this.activeTab = "generate";
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] || null;
  }

  async uploadFileSource(): Promise<void> {
    if (!this.selectedFile) {
      this.setStatus("Choose a PDF, TXT, or DOCX file first.");
      return;
    }

    const file = this.selectedFile;
    await this.withBusy("Uploading source", async () => {
      const presign = await this.apiFetch<{ documentId: string; uploadUrl: string; asset: KnowledgeAsset }>(
        "/uploads/presign",
        {
          method: "POST",
          body: JSON.stringify({
            fileName: file.name,
            fileSizeBytes: file.size,
            contentType: file.type || "application/octet-stream",
          }),
        },
      );

      this.upsertAsset(presign.asset);
      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with ${uploadResponse.status}`);
      }

      this.addActivity(`Uploaded ${file.name}. Processing started.`);
      await this.pollKnowledge(presign.documentId);
    });
  }

  toggleSource(asset: KnowledgeAsset): void {
    if (asset.status !== "READY") {
      this.setStatus("Only READY sources can be selected.");
      return;
    }

    if (this.selectedSourceIds.has(asset.id)) {
      this.selectedSourceIds.delete(asset.id);
    } else {
      this.selectedSourceIds.add(asset.id);
    }
    this.persistSelection();
  }

  clearLocalSources(): void {
    this.assets = [];
    this.selectedSourceIds.clear();
    localStorage.removeItem("exam-prep-selected-source-ids");
    this.addActivity("Cleared browser-local source list and selection. Backend files were not deleted.");
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
      this.setStatus("Select at least one ready source.");
      this.activeTab = "sources";
      return;
    }

    await this.withBusy("Creating exam job", async () => {
      const payload = await this.apiFetch<{ jobId: string; job: ExamJob }>("/exam-jobs", {
        method: "POST",
        body: JSON.stringify({
          sourceAssetIds,
          certificationName: this.certificationName,
          questionCount: this.questionCount,
          questionTypes: this.selectedQuestionTypes(),
          includeDistractors: this.includeDistractors,
        }),
      });

      this.addActivity(`Exam job ${payload.jobId} started.`);
      await this.pollJob(payload.jobId);
      await this.loadJobs();
    });
  }

  async openJob(jobId: string): Promise<void> {
    await this.withBusy("Loading exam job", async () => {
      const payload = await this.apiFetch<{ job: ExamJob; result?: ExamResult }>(`/exam-jobs/${jobId}`);
      if (payload.result) {
        this.setResult(payload.result);
        this.activeTab = "review";
      }
      this.setTechnicalDetails(payload);
    });
  }

  selectChoice(index: number, choice: string): void {
    this.interactions[index].selectedChoice = choice;
  }

  toggleHint(index: number): void {
    this.interactions[index].showHint = !this.interactions[index].showHint;
  }

  toggleAnswer(index: number): void {
    this.interactions[index].showAnswer = !this.interactions[index].showAnswer;
  }

  resetQuestion(index: number): void {
    this.interactions[index] = {
      selectedChoice: null,
      showHint: false,
      showAnswer: false,
    };
  }

  isSelectedAnswer(index: number, choice: string): boolean {
    return this.interactions[index]?.selectedChoice === choice;
  }

  isCorrectChoice(question: ExamQuestion, choice: string): boolean {
    return question.correctAnswer.trim().toLowerCase() === choice.trim().toLowerCase();
  }

  isIncorrectSelection(index: number, question: ExamQuestion, choice: string): boolean {
    const interaction = this.interactions[index];
    return Boolean(interaction?.showAnswer && interaction.selectedChoice === choice && !this.isCorrectChoice(question, choice));
  }

  private async loadConfig(): Promise<void> {
    const response = await fetch("assets/runtime-config.json", { cache: "no-store" });
    this.config = (await response.json()) as RuntimeConfig;
  }

  private async completeHostedUiSignIn(): Promise<void> {
    if (!this.config) {
      return;
    }

    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code) {
      return;
    }

    const expectedState = localStorage.getItem("exam-prep-oauth-state");
    const verifier = localStorage.getItem("exam-prep-pkce-verifier");
    if (!state || state !== expectedState || !verifier) {
      throw new Error("Invalid Cognito sign-in response.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.cognitoClientId,
      code,
      redirect_uri: this.redirectUri(),
      code_verifier: verifier,
    });

    const response = await fetch(`${this.authDomain()}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed with ${response.status}`);
    }

    const tokenPayload = (await response.json()) as Record<string, string | number>;
    const tokens: TokenSet = {
      accessToken: String(tokenPayload["access_token"] || ""),
      idToken: String(tokenPayload["id_token"] || ""),
      refreshToken: String(tokenPayload["refresh_token"] || ""),
      expiresAt: Date.now() + Number(tokenPayload["expires_in"] || 3600) * 1000,
    };
    localStorage.setItem("exam-prep-token-set", JSON.stringify(tokens));
    localStorage.removeItem("exam-prep-pkce-verifier");
    localStorage.removeItem("exam-prep-oauth-state");
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  private loadStoredSession(): void {
    const raw = localStorage.getItem("exam-prep-token-set");
    if (!raw) {
      return;
    }

    try {
      this.tokens = JSON.parse(raw) as TokenSet;
    } catch (_error) {
      this.clearSession();
    }
  }

  private clearSession(): void {
    this.tokens = null;
    localStorage.removeItem("exam-prep-token-set");
  }

  private loadStoredSelection(): void {
    const raw = localStorage.getItem("exam-prep-selected-source-ids");
    if (!raw) {
      return;
    }
    try {
      this.selectedSourceIds = new Set(JSON.parse(raw) as string[]);
    } catch (_error) {
      this.selectedSourceIds.clear();
    }
  }

  private persistSelection(): void {
    localStorage.setItem("exam-prep-selected-source-ids", JSON.stringify(Array.from(this.selectedSourceIds)));
  }

  private async loadInitialData(): Promise<void> {
    await this.withBusy("Loading workspace", async () => {
      await Promise.all([this.loadProfiles(), this.loadAssets(), this.loadJobs()]);
      this.setStatus("Ready");
    });
  }

  private async loadProfiles(): Promise<void> {
    const payload = await this.apiFetch<{ profiles: CertificationProfile[] }>("/certification-profiles");
    this.profiles = payload.profiles;
    if (!this.selectedProfileId && this.profiles.length) {
      this.selectedProfileId = this.profiles[0].id;
      this.applyProfile();
    }
  }

  private async loadAssets(): Promise<void> {
    const payload = await this.apiFetch<{ assets: KnowledgeAsset[] }>("/knowledge");
    this.assets = payload.assets;
    this.selectedSourceIds = new Set(Array.from(this.selectedSourceIds).filter((id) => this.assets.some((asset) => asset.id === id)));
    this.persistSelection();
  }

  private async loadJobs(): Promise<void> {
    const payload = await this.apiFetch<{ jobs: ExamJob[] }>("/exam-jobs");
    this.jobs = payload.jobs;
  }

  private async pollKnowledge(documentId: string): Promise<void> {
    for (let attempt = 1; attempt <= 90; attempt += 1) {
      const payload = await this.apiFetch<{ asset: KnowledgeAsset }>(`/knowledge/${documentId}`);
      this.upsertAsset(payload.asset);

      if (payload.asset.status === "READY") {
        this.selectedSourceIds.add(payload.asset.id);
        this.persistSelection();
        this.addActivity(`Source ${documentId} is ready.`);
        this.activeTab = "generate";
        return;
      }

      if (payload.asset.status === "FAILED") {
        throw new Error(payload.asset.error || "Source processing failed.");
      }

      await this.delay(2000);
    }

    throw new Error("Timed out waiting for source processing.");
  }

  private async pollJob(jobId: string): Promise<void> {
    for (let attempt = 1; attempt <= 60; attempt += 1) {
      const payload = await this.apiFetch<{ job: ExamJob; result?: ExamResult }>(`/exam-jobs/${jobId}`);
      if (payload.job.status === "COMPLETED" && payload.result) {
        this.setResult(payload.result);
        this.addActivity(`Exam job ${jobId} completed.`);
        this.activeTab = "review";
        return;
      }

      if (payload.job.status === "FAILED") {
        throw new Error(payload.job.error || "Exam generation failed.");
      }

      await this.delay(2500);
    }

    throw new Error("Timed out waiting for exam generation.");
  }

  private setResult(result: ExamResult): void {
    this.result = result;
    this.interactions = result.questions.map(() => ({
      selectedChoice: null,
      showHint: false,
      showAnswer: false,
    }));
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

  private upsertAsset(asset: KnowledgeAsset): void {
    const existingIndex = this.assets.findIndex((item) => item.id === asset.id);
    if (existingIndex >= 0) {
      this.assets[existingIndex] = asset;
    } else {
      this.assets = [asset, ...this.assets];
    }
  }

  private async apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.config) {
      throw new Error("Runtime config is missing.");
    }
    if (!this.tokens?.accessToken || this.isTokenExpired()) {
      this.clearSession();
      throw new Error("Sign in again before calling the API.");
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${this.tokens.accessToken}`);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      ...options,
      headers,
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    this.setTechnicalDetails({ path, status: response.status, payload });

    if (!response.ok) {
      throw new Error(payload.message || `Request failed with ${response.status}`);
    }
    return payload as T;
  }

  private async withBusy(label: string, action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.setStatus(label);
    try {
      await action();
      if (this.isAuthenticated) {
        this.setStatus("Ready");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.setStatus(message);
      this.addActivity(message);
      this.setTechnicalDetails({ error: message });
    } finally {
      this.busy = false;
    }
  }

  private setStatus(message: string): void {
    this.status = message;
  }

  private addActivity(message: string): void {
    this.activity = [message, ...this.activity].slice(0, 8);
  }

  private setTechnicalDetails(payload: unknown): void {
    this.technicalDetails = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  }

  private isTokenExpired(): boolean {
    return Boolean(this.tokens && Date.now() > this.tokens.expiresAt - 60000);
  }

  private authDomain(): string {
    return String(this.config?.cognitoDomain || "").replace(/\/$/, "");
  }

  private redirectUri(): string {
    return this.config?.redirectUri || `${window.location.origin}/`;
  }

  private logoutUri(): string {
    return this.config?.logoutUri || `${window.location.origin}/`;
  }

  private createRandomString(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return this.base64Url(bytes);
  }

  private async createCodeChallenge(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    return this.base64Url(new Uint8Array(digest));
  }

  private base64Url(bytes: Uint8Array): string {
    let text = "";
    bytes.forEach((byte) => {
      text += String.fromCharCode(byte);
    });
    return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }
}
