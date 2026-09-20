import { ApiClient } from "@dark-horse-safety/api-client";
import { api } from "@/lib/api";

type ApiData<T> = { data: T };

function q(params?: Record<string, string | number | undefined | null>) {
  return ApiClient.query(
    params as Record<string, string | number | boolean | undefined>,
  );
}

export type SafetyFieldType =
  | "TEXT"
  | "NUMBER"
  | "STATIC_TEXT"
  | "CALCULATOR"
  | "RATING"
  | "DROPDOWN"
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICES"
  | "PHOTO"
  | "SIGNATURE"
  | "DRAWING"
  | "STATIC_IMAGE"
  | "DATE"
  | "TIME"
  | "GPS"
  | "CHECKBOX"
  | "LINK"
  | "MIRROR"
  | "BARCODE"
  | string;

export type SafetyFormField = {
  id: string;
  type: SafetyFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
};

export type SafetyFormSection = {
  id: string;
  title: string;
  required?: boolean;
  fields: SafetyFormField[];
};

export type SafetyFieldLibraryCategory = {
  category: string;
  items: Array<{ type: string; label: string }>;
};

export type SafetyFormListItem = {
  id: string;
  code: string;
  title: string;
  version: string;
  status: string;
  submissionCount: number;
  updatedAt: string;
};

export type SafetyFormDetail = {
  id: string;
  code: string;
  title: string;
  version: string;
  status: string;
  sections: SafetyFormSection[];
  definition: { sections: SafetyFormSection[] };
  fieldLibrary: SafetyFieldLibraryCategory[];
  updatedAt: string;
  createdAt: string;
};

export type SafetyFormPreview = {
  form: {
    id: string;
    code: string;
    title: string;
    version: string;
    sections: SafetyFormSection[];
  };
  submission: {
    id: string;
    code: string;
    status: string;
    workOrderCode: string | null;
    customerName: string | null;
    locationLabel: string | null;
    submittedByName: string | null;
    submittedAt: string | null;
    lockedAt: string | null;
    values: Record<string, unknown>;
    meta: {
      company?: {
        name?: string;
        address?: string;
        phone?: string;
        website?: string;
      };
      formLabel?: string;
      formDate?: string;
      workOrder?: string;
      customer?: string;
      location?: string;
      submittedLabel?: string;
      employee?: {
        name?: string;
        id?: string;
        inspectionDate?: string;
        crew?: string;
      };
      companyInfo?: {
        name?: string;
        contact?: string;
        phone?: string;
        siteAddress?: string;
      };
      equipment?: {
        type?: string;
        serial?: string;
        lastCalibrated?: string;
        condition?: string;
      };
      signature?: {
        title?: string;
        onFile?: boolean;
        signedBy?: string;
        signedAt?: string;
        gps?: string;
      };
      footer?: {
        submissionId?: string;
        submittedBy?: string;
        submittedAt?: string;
        locked?: boolean;
      };
      [key: string]: unknown;
    };
  };
  printTitle: string;
  previewDate: string;
};

export type UpdateSafetyFormInput = {
  title?: string;
  version?: string;
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
  sections?: SafetyFormSection[];
};

export const safetyApi = {
  listForms(params?: { q?: string; status?: string }) {
    return api.get<
      ApiData<{
        items: SafetyFormListItem[];
        total: number;
        fieldLibrary: SafetyFieldLibraryCategory[];
      }>
    >(`/safety/forms${q(params)}`);
  },

  getForm(id: string) {
    return api.get<ApiData<SafetyFormDetail>>(`/safety/forms/${id}`);
  },

  updateForm(id: string, body: UpdateSafetyFormInput) {
    return api.patch<ApiData<SafetyFormDetail>>(`/safety/forms/${id}`, body);
  },

  previewForm(id: string, submissionId?: string) {
    return api.get<ApiData<SafetyFormPreview>>(
      `/safety/forms/${id}/preview${q({ submissionId })}`,
    );
  },
};
