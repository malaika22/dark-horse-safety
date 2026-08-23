import type {
  ApiClientConfig,
  ActivateAccountPayload,
  AuthApiError,
  GoogleLoginPayload,
  InvitePreview,
  LoginPayload,
  LoginResult,
  LoginWithEmailPayload,
  RequestInvitePayload,
  ResendInvitePayload,
  ResendInviteResult,
  ResetPasswordRequestPayload,
  ResetPasswordRequestResult,
  SessionUser,
  SetNewPasswordPayload,
} from "@dark-horse-safety/types";

export type { ApiClientConfig } from "@dark-horse-safety/types";

export class ApiError extends Error {
  readonly code: string;
  readonly attemptsLeft?: number;
  readonly lockedUntil?: string;
  readonly lockDurationMinutes?: number;
  readonly maxLoginAttempts?: number;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(status: number, error: AuthApiError) {
    super(error.message);
    this.name = "ApiError";
    this.status = status;
    this.code = error.code;
    this.attemptsLeft = error.attemptsLeft;
    this.lockedUntil = error.lockedUntil;
    this.lockDurationMinutes = error.lockDurationMinutes;
    this.maxLoginAttempts = error.maxLoginAttempts;
    this.details = error.details;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getToken?: ApiClientConfig["getToken"];

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.getToken = config.getToken;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.getToken ? await this.getToken() : null;
    const headers = new Headers(init.headers);

    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      let payload: { error?: AuthApiError } | null = null;
      try {
        payload = (await response.json()) as { error?: AuthApiError };
      } catch {
        payload = null;
      }
      throw new ApiError(response.status, {
        code: payload?.error?.code ?? "INTERNAL_ERROR",
        message:
          payload?.error?.message ?? `Request failed (${response.status})`,
        attemptsLeft: payload?.error?.attemptsLeft,
        lockedUntil: payload?.error?.lockedUntil,
        lockDurationMinutes: payload?.error?.lockDurationMinutes,
        maxLoginAttempts: payload?.error?.maxLoginAttempts,
        details: payload?.error?.details,
      });
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  get<T>(path: string, init?: RequestInit) {
    return this.request<T>(path, { ...init, method: "GET" });
  }

  post<T>(path: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  put<T>(path: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "PUT",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  delete<T>(path: string, init?: RequestInit) {
    return this.request<T>(path, { ...init, method: "DELETE" });
  }

  login(payload: LoginWithEmailPayload | LoginPayload) {
    return this.post<{ data: LoginResult }>("/auth/login", payload);
  }

  loginWithGoogle(payload: GoogleLoginPayload) {
    return this.post<{ data: LoginResult }>("/auth/google", payload);
  }

  me() {
    return this.get<{ data: SessionUser }>("/auth/me");
  }

  forgotPassword(payload: ResetPasswordRequestPayload) {
    return this.post<{ data: ResetPasswordRequestResult }>(
      "/auth/forgot-password",
      payload,
    );
  }

  resendReset(payload: ResetPasswordRequestPayload) {
    return this.post<{ data: ResetPasswordRequestResult }>(
      "/auth/resend-reset",
      payload,
    );
  }

  resetPassword(payload: SetNewPasswordPayload) {
    return this.post<{ data: { message: string } }>(
      "/auth/reset-password",
      payload,
    );
  }

  getInvite(token: string) {
    return this.get<{ data: InvitePreview }>(
      `/auth/invite/${encodeURIComponent(token)}`,
    );
  }

  acceptInvite(payload: ActivateAccountPayload) {
    return this.post<{ data: LoginResult }>("/auth/invite/accept", payload);
  }

  requestInvite(payload: RequestInvitePayload) {
    return this.post<{ data: { message: string; email: string } }>(
      "/auth/invite/request",
      payload,
    );
  }

  resendInvite(payload: ResendInvitePayload) {
    return this.post<{ data: ResendInviteResult }>(
      "/auth/invite/resend",
      payload,
    );
  }
}

export function createApiClient(config: ApiClientConfig) {
  return new ApiClient(config);
}
