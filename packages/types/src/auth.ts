import type { EmailAddress, EntityId, IsoDateString, PhoneNumber } from "./common";
import type { SessionUser } from "./user";

export type AuthMethod = "email" | "phone" | "google";

export type AuthTab = "email" | "phone";

export type LoginWithEmailPayload = {
  email: EmailAddress;
  password: string;
};

export type LoginWithPhonePayload = {
  phone: PhoneNumber;
  password: string;
};

export type LoginPayload = LoginWithEmailPayload | LoginWithPhonePayload;

export type GoogleLoginPayload = {
  /** GIS Sign-In ID token */
  idToken?: string;
  /** GIS popup authorization code (exchanged server-side with redirect_uri=postmessage) */
  code?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: IsoDateString;
};

export type LoginResult = {
  tokens: AuthTokens;
  user: SessionUser;
  userId: EntityId;
};

export type ResetPasswordRequestPayload = {
  email: EmailAddress;
};

export type ResetPasswordRequestResult = {
  message: string;
  expiresInSeconds: number;
};

export type SetNewPasswordPayload = {
  token: string;
  password: string;
  confirmPassword: string;
};

export type ActivateAccountPayload = {
  inviteToken: string;
  password: string;
  confirmPassword: string;
};

export type InviteStatus = "pending" | "accepted" | "expired" | "revoked";

export type Invite = {
  id: EntityId;
  email: EmailAddress;
  role: string;
  inviterName?: string;
  status: InviteStatus;
  expiresAt: IsoDateString;
};

export type InvitePreview = {
  email: EmailAddress;
  role: string;
  inviterName?: string;
  expiresAt: IsoDateString;
};

export type AcceptInviteParams = {
  email?: EmailAddress;
  inviter?: string;
  role?: string;
  token?: string;
};

export type RequestInvitePayload = {
  email: EmailAddress;
};

export type ResendInvitePayload = {
  email: EmailAddress;
};

export type ResendInviteResult = {
  message: string;
  email: EmailAddress;
  expiresAt: IsoDateString;
  expiresInDays: number;
};

export type AuthApiError = {
  code: string;
  message: string;
  attemptsLeft?: number;
  lockedUntil?: IsoDateString;
  lockDurationMinutes?: number;
  maxLoginAttempts?: number;
  details?: Record<string, string[]>;
};
