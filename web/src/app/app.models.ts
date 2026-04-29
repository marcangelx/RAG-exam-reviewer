export type AppTab = "sources" | "generate" | "review" | "history";
export type QuestionType = "MULTIPLE_CHOICE" | "FILL_IN_THE_BLANK" | "TRICK";

export interface RuntimeConfig {
  apiBaseUrl: string;
  cognitoDomain: string;
  cognitoClientId: string;
  redirectUri: string;
  logoutUri: string;
}

export interface TokenSet {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface KnowledgeAsset {
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

export interface CertificationProfile {
  id: string;
  name: string;
  questionCount: number;
  questionTypes: QuestionType[];
  includeDistractors: boolean;
}

export interface ExamJob {
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

export interface ExamQuestion {
  type: QuestionType;
  prompt: string;
  choices: string[];
  hint: string;
  correctAnswer: string;
  explanation: string;
  difficulty: string;
  sourceEvidence: string[];
}

export interface ExamResult {
  examTitle: string;
  questions: ExamQuestion[];
}

export interface QuestionInteraction {
  selectedChoice: string | null;
  showHint: boolean;
  showAnswer: boolean;
}

export type RetryAction = (() => Promise<void>) | null;
export type WorkflowState = "current" | "done" | "upcoming";

export interface WorkflowStep {
  index: number;
  label: string;
  detail: string;
  tab: AppTab;
  state: WorkflowState;
}

export interface CreateExamJobRequest {
  sourceAssetIds: string[];
  certificationName: string;
  questionCount: number;
  questionTypes: QuestionType[];
  includeDistractors: boolean;
}
