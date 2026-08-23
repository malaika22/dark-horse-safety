import type { EmailAddress, EntityId, IsoDateString } from "./common";

export type UserRole =
  | "admin"
  | "supervisor"
  | "technician"
  | "operator"
  | (string & {});

export type AccountStatus =
  | "active"
  | "invited"
  | "locked"
  | "disabled"
  | "pending_password";

export type User = {
  id: EntityId;
  email: EmailAddress;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
};

export type SessionUser = Pick<User, "id" | "role" | "status"> & {
  email?: string;
  phone?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
};
