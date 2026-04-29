import { Injectable, inject, signal } from "@angular/core";

import { AuthService } from "./auth.service";

@Injectable({ providedIn: "root" })
export class ExamApiService {
  private readonly auth = inject(AuthService);

  readonly technicalDetails = signal("No API activity yet.");

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const config = this.auth.config();
    const tokens = this.auth.tokens();
    if (!config) {
      throw new Error("The app is missing its connection settings. Redeploy the frontend config.");
    }
    if (!tokens?.accessToken || this.auth.isTokenExpired()) {
      this.auth.clearSession();
      throw new Error("Your session expired. Sign in again to continue.");
    }

    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${tokens.accessToken}`);
    if (options.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      ...options,
      headers,
    });
    const text = await response.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_error) {
      payload = { message: "The server returned an unreadable response." };
    }
    this.setTechnicalDetails({ path, status: response.status, payload });

    if (!response.ok) {
      this.throwRequestError(response.status, payload);
    }
    return payload as T;
  }

  setTechnicalDetails(payload: unknown): void {
    this.technicalDetails.set(typeof payload === "string" ? payload : JSON.stringify(payload, null, 2));
  }

  private throwRequestError(status: number, payload: Record<string, unknown>): never {
    if (status === 401 || status === 403) {
      this.auth.clearSession();
      throw new Error("Your session expired. Sign in again to continue.");
    }
    if (status === 429) {
      throw new Error("The app is receiving too many requests. Wait a moment, then try again.");
    }
    if (status >= 500) {
      throw new Error("The service is having trouble. Try again in a moment.");
    }
    throw new Error(String(payload["message"] || "The request failed. Try again, or check technical details."));
  }
}
