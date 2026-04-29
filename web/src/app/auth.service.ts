import { Injectable, computed, signal } from "@angular/core";

import { RuntimeConfig, TokenSet } from "./app.models";

@Injectable({ providedIn: "root" })
export class AuthService {
  readonly config = signal<RuntimeConfig | null>(null);
  readonly tokens = signal<TokenSet | null>(null);
  readonly isAuthenticated = computed(() => Boolean(this.tokens()?.accessToken) && !this.isTokenExpired());

  async initialize(): Promise<void> {
    await this.loadConfig();
    await this.completeHostedUiSignIn();
    this.loadStoredSession();
  }

  async signIn(): Promise<void> {
    const config = this.config();
    if (!config) {
      throw new Error("The app is missing its connection settings. Redeploy the frontend config.");
    }

    const verifier = this.createRandomString();
    const challenge = await this.createCodeChallenge(verifier);
    const state = this.createRandomString();
    localStorage.setItem("exam-prep-pkce-verifier", verifier);
    localStorage.setItem("exam-prep-oauth-state", state);

    const params = new URLSearchParams({
      client_id: config.cognitoClientId,
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
    const config = this.config();
    this.clearSession();
    if (!config) {
      return;
    }

    const params = new URLSearchParams({
      client_id: config.cognitoClientId,
      logout_uri: this.logoutUri(),
    });
    window.location.assign(`${this.authDomain()}/logout?${params.toString()}`);
  }

  clearSession(): void {
    this.tokens.set(null);
    localStorage.removeItem("exam-prep-token-set");
  }

  isTokenExpired(): boolean {
    const tokens = this.tokens();
    return Boolean(tokens && Date.now() > tokens.expiresAt - 60000);
  }

  private async loadConfig(): Promise<void> {
    const response = await fetch("assets/runtime-config.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Could not load app settings. Refresh the page after deployment finishes.");
    }
    this.config.set((await response.json()) as RuntimeConfig);
  }

  private async completeHostedUiSignIn(): Promise<void> {
    const config = this.config();
    if (!config) {
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
      throw new Error("Sign-in could not be verified. Try signing in again.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.cognitoClientId,
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
      throw new Error("Sign-in could not finish. Try signing in again.");
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
    this.tokens.set(tokens);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  private loadStoredSession(): void {
    const raw = localStorage.getItem("exam-prep-token-set");
    if (!raw) {
      return;
    }

    try {
      this.tokens.set(JSON.parse(raw) as TokenSet);
    } catch (_error) {
      this.clearSession();
    }
  }

  private authDomain(): string {
    return String(this.config()?.cognitoDomain || "").replace(/\/$/, "");
  }

  private redirectUri(): string {
    return this.config()?.redirectUri || `${window.location.origin}/`;
  }

  private logoutUri(): string {
    return this.config()?.logoutUri || `${window.location.origin}/`;
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
}
