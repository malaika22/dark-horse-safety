/** Make all properties optional recursively */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** Remove nullability from a type */
export type NonNullableFields<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;
};

/** ID branded as string for clarity across API/domain */
export type EntityId = string;

/** ISO-8601 datetime string from the API */
export type IsoDateString = string;

/** Email address string */
export type EmailAddress = string;

/** Phone number string (E.164 preferred) */
export type PhoneNumber = string;
