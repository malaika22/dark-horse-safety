export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "ACCOUNT_LOCKED"
  | "INVITE_EXPIRED"
  | "INTERNAL_ERROR"
  | (string & {});

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, string[]>;
};

export type ApiSuccessResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type ApiFailureResponse = {
  error: ApiError;
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiFailureResponse;

export type ApiClientConfig = {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
