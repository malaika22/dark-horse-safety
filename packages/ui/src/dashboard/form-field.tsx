"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { ChevronDownIcon } from "./icons";

export interface DashboardFieldProps {
  label: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

/** Uppercase field label + control — shared across CRM / HR forms. */
export function DashboardField({
  label,
  htmlFor,
  className,
  children,
}: DashboardFieldProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("flex min-w-0 flex-col gap-2", className)}
    >
      <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
        {label}
      </span>
      {children}
    </label>
  );
}

const controlClass =
  "h-10 w-full rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] outline-none transition-colors placeholder:text-[#959597] focus:border-[#5A5A5A] disabled:cursor-not-allowed disabled:opacity-50 md:text-[13px]";

export interface DashboardTextFieldProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  containerClassName?: string;
}

export function DashboardTextField({
  label,
  id,
  containerClassName,
  className,
  ...props
}: DashboardTextFieldProps) {
  const fieldId = id ?? React.useId();
  return (
    <DashboardField label={label} htmlFor={fieldId} className={containerClassName}>
      <input id={fieldId} className={cn(controlClass, className)} {...props} />
    </DashboardField>
  );
}

export interface DashboardSelectOption {
  value: string;
  label: string;
}

export interface DashboardSelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: DashboardSelectOption[];
  containerClassName?: string;
}

export function DashboardSelectField({
  label,
  id,
  options,
  containerClassName,
  className,
  ...props
}: DashboardSelectFieldProps) {
  const fieldId = id ?? React.useId();
  return (
    <DashboardField label={label} htmlFor={fieldId} className={containerClassName}>
      <div className="relative">
        <select
          id={fieldId}
          className={cn(controlClass, "appearance-none pr-9", className)}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-white" />
      </div>
    </DashboardField>
  );
}

export interface DashboardToggleProps {
  label: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

/** Compact labeled switch — permissions / rules. */
export function DashboardToggle({
  label,
  checked = false,
  onCheckedChange,
  className,
}: DashboardToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border border-[#3E3E3E] bg-[#2A2A2A] px-3 py-2.5",
        className,
      )}
    >
      <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[12px]">
        {label}
      </span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-[#FDFDFF]" : "bg-[#3E3E3E]",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full transition-transform",
            checked ? "translate-x-4 bg-[#1A1A1A]" : "bg-[#959597]",
          )}
        />
      </span>
    </button>
  );
}

export interface DashboardChoiceChip {
  id: string;
  label: string;
}

export interface DashboardChoiceChipsProps {
  label?: string;
  options: DashboardChoiceChip[];
  value: string[];
  onChange?: (next: string[]) => void;
  className?: string;
}

/** Multi-select chip group (e.g. requirements on file). */
export function DashboardChoiceChips({
  label,
  options,
  value,
  onChange,
  className,
}: DashboardChoiceChipsProps) {
  function toggle(id: string) {
    if (!onChange) return;
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label ? (
        <span className="font-sans text-[11px] font-normal uppercase leading-none tracking-[-0.02em] text-[#959597] md:text-[12px]">
          {label}
        </span>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggle(opt.id)}
              className={cn(
                "rounded-md border px-2.5 py-1.5 font-sans text-[11px] font-[510] uppercase leading-none tracking-[-0.02em] transition-colors",
                active
                  ? "border-[#3E3E3E] bg-[#353535] text-white"
                  : "border-[#3E3E3E]/60 bg-[#2A2A2A] text-[#959597] hover:bg-[#333333] hover:text-white",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface DashboardFormGridProps {
  children: React.ReactNode;
  className?: string;
  /** Desktop columns — defaults to 2 */
  columns?: 1 | 2 | 3;
}

export function DashboardFormGrid({
  children,
  className,
  columns = 2,
}: DashboardFormGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        columns === 2 && "md:grid-cols-2",
        columns === 3 && "md:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
