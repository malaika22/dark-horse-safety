"use client";

import * as React from "react";
import {
  CrmConfirmModal,
  CrmPickModal,
  CrmPromptFieldsModal,
  type CrmPickOption,
} from "./crm-action-modals";

export type CrmConfirmAskOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export type CrmPromptAskOptions = {
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
};

export type CrmPickAskOptions = {
  title: string;
  label?: string;
  options: CrmPickOption[];
  confirmLabel?: string;
};

type ConfirmState = CrmConfirmAskOptions & {
  resolve: (ok: boolean) => void;
};

type PromptState = CrmPromptAskOptions & {
  resolve: (value: string | null) => void;
};

type PickState = CrmPickAskOptions & {
  resolve: (value: string | null) => void;
};

/**
 * Promise-based CRM dialogs that match the dark shell design
 * (replaces window.confirm / window.prompt).
 */
export function useCrmDialogs() {
  const [confirmState, setConfirmState] = React.useState<ConfirmState | null>(
    null,
  );
  const [promptState, setPromptState] = React.useState<PromptState | null>(
    null,
  );
  const [pickState, setPickState] = React.useState<PickState | null>(null);

  const askConfirm = React.useCallback((opts: CrmConfirmAskOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ ...opts, resolve });
    });
  }, []);

  const askPrompt = React.useCallback((opts: CrmPromptAskOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptState({ ...opts, resolve });
    });
  }, []);

  const askPick = React.useCallback((opts: CrmPickAskOptions) => {
    return new Promise<string | null>((resolve) => {
      setPickState({ ...opts, resolve });
    });
  }, []);

  const closeConfirm = React.useCallback((ok: boolean) => {
    setConfirmState((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);

  const closePrompt = React.useCallback((value: string | null) => {
    setPromptState((prev) => {
      prev?.resolve(value);
      return null;
    });
  }, []);

  const closePick = React.useCallback((value: string | null) => {
    setPickState((prev) => {
      prev?.resolve(value);
      return null;
    });
  }, []);

  const promptFields = React.useMemo(
    () => [
      {
        key: "value",
        label: promptState?.label ?? "Value",
        placeholder: promptState?.placeholder,
        defaultValue: promptState?.defaultValue ?? "",
      },
    ],
    [
      promptState?.label,
      promptState?.placeholder,
      promptState?.defaultValue,
    ],
  );

  const pickOptions = pickState?.options ?? [];

  const dialogs = (
    <>
      <CrmConfirmModal
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ""}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        cancelLabel={confirmState?.cancelLabel}
        destructive={confirmState?.destructive}
        onClose={() => closeConfirm(false)}
        onConfirm={() => closeConfirm(true)}
      />
      <CrmPromptFieldsModal
        open={Boolean(promptState)}
        title={promptState?.title ?? ""}
        confirmLabel={promptState?.confirmLabel ?? "Save"}
        fields={promptFields}
        onClose={() => closePrompt(null)}
        onConfirm={(values) => {
          closePrompt(values.value ?? "");
        }}
      />
      <CrmPickModal
        open={Boolean(pickState)}
        title={pickState?.title ?? ""}
        label={pickState?.label}
        options={pickOptions}
        confirmLabel={pickState?.confirmLabel}
        onClose={() => closePick(null)}
        onConfirm={(value) => {
          closePick(value);
        }}
      />
    </>
  );

  return { askConfirm, askPrompt, askPick, dialogs };
}
