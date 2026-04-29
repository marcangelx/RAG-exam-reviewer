import { Injectable, computed, inject, signal } from "@angular/core";

import { CertificationProfile, CreateExamJobRequest, ExamJob, ExamResult, KnowledgeAsset } from "./app.models";
import { ExamApiService } from "./exam-api.service";

@Injectable({ providedIn: "root" })
export class WorkspaceDataService {
  private readonly api = inject(ExamApiService);

  readonly assets = signal<KnowledgeAsset[]>([]);
  readonly profiles = signal<CertificationProfile[]>([]);
  readonly jobs = signal<ExamJob[]>([]);
  readonly selectedSourceIds = signal(new Set<string>());
  readonly readyAssets = computed(() => this.assets().filter((asset) => asset.status === "READY"));
  readonly pendingAssets = computed(() => this.assets().filter((asset) => asset.status !== "READY"));
  readonly selectedAssets = computed(() => this.readyAssets().filter((asset) => this.selectedSourceIds().has(asset.id)));

  loadStoredSelection(): void {
    const raw = localStorage.getItem("exam-prep-selected-source-ids");
    if (!raw) {
      return;
    }
    try {
      this.selectedSourceIds.set(new Set(JSON.parse(raw) as string[]));
    } catch (_error) {
      this.selectedSourceIds.set(new Set());
    }
  }

  async loadInitialData(): Promise<void> {
    await Promise.all([this.loadProfiles(), this.loadAssets(), this.loadJobs()]);
  }

  async loadProfiles(): Promise<void> {
    const payload = await this.api.request<{ profiles: CertificationProfile[] }>("/certification-profiles");
    this.profiles.set(payload.profiles);
  }

  async loadAssets(): Promise<void> {
    const payload = await this.api.request<{ assets: KnowledgeAsset[] }>("/knowledge");
    this.assets.set(payload.assets);
    this.selectedSourceIds.set(new Set(Array.from(this.selectedSourceIds()).filter((id) => payload.assets.some((asset) => asset.id === id))));
    this.persistSelection();
  }

  async loadJobs(): Promise<void> {
    const payload = await this.api.request<{ jobs: ExamJob[] }>("/exam-jobs");
    this.jobs.set(payload.jobs);
  }

  async saveTextSource(title: string, text: string): Promise<KnowledgeAsset> {
    const payload = await this.api.request<{ documentId: string; asset: KnowledgeAsset }>("/knowledge/text", {
      method: "POST",
      body: JSON.stringify({ title, text }),
    });
    this.upsertAsset(payload.asset);
    this.selectSource(payload.asset.id);
    return payload.asset;
  }

  async createPresignedUpload(file: File): Promise<{ documentId: string; uploadUrl: string; asset: KnowledgeAsset }> {
    const payload = await this.api.request<{ documentId: string; uploadUrl: string; asset: KnowledgeAsset }>("/uploads/presign", {
      method: "POST",
      body: JSON.stringify({
        fileName: file.name,
        fileSizeBytes: file.size,
        contentType: file.type || "application/octet-stream",
      }),
    });
    this.upsertAsset(payload.asset);
    return payload;
  }

  async getKnowledge(documentId: string): Promise<KnowledgeAsset> {
    const payload = await this.api.request<{ asset: KnowledgeAsset }>(`/knowledge/${documentId}`);
    this.upsertAsset(payload.asset);
    return payload.asset;
  }

  async createExamJob(request: CreateExamJobRequest): Promise<ExamJob> {
    const payload = await this.api.request<{ jobId: string; job: ExamJob }>("/exam-jobs", {
      method: "POST",
      body: JSON.stringify(request),
    });
    return payload.job;
  }

  async getExamJob(jobId: string): Promise<{ job: ExamJob; result?: ExamResult }> {
    return this.api.request<{ job: ExamJob; result?: ExamResult }>(`/exam-jobs/${jobId}`);
  }

  toggleSource(asset: KnowledgeAsset): void {
    if (asset.status !== "READY") {
      throw new Error("This source is still being prepared. Select it once it is ready.");
    }
    const next = new Set(this.selectedSourceIds());
    if (next.has(asset.id)) {
      next.delete(asset.id);
    } else {
      next.add(asset.id);
    }
    this.selectedSourceIds.set(next);
    this.persistSelection();
  }

  selectSource(id: string): void {
    const next = new Set(this.selectedSourceIds());
    next.add(id);
    this.selectedSourceIds.set(next);
    this.persistSelection();
  }

  clearLocalSources(): void {
    this.assets.set([]);
    this.selectedSourceIds.set(new Set());
    localStorage.removeItem("exam-prep-selected-source-ids");
  }

  upsertAsset(asset: KnowledgeAsset): void {
    const existing = this.assets();
    if (existing.some((item) => item.id === asset.id)) {
      this.assets.set(existing.map((item) => (item.id === asset.id ? asset : item)));
    } else {
      this.assets.set([asset, ...existing]);
    }
  }

  private persistSelection(): void {
    localStorage.setItem("exam-prep-selected-source-ids", JSON.stringify(Array.from(this.selectedSourceIds())));
  }
}
