"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";

function useEscape(onEscape?: () => void, enabled = true) {
  React.useEffect(() => {
    if (!enabled || !onEscape) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled, onEscape]);
}

function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  onOutside?: () => void,
  enabled = true,
) {
  const refsRef = React.useRef(refs);
  refsRef.current = refs;

  React.useEffect(() => {
    if (!enabled || !onOutside) return;
    function onPointerDown(event: MouseEvent) {
      if (event.defaultPrevented) return;
      const target = event.target as Node;
      const inside = refsRef.current.some(
        (ref) => ref.current?.contains(target),
      );
      if (!inside) onOutside?.();
    }
    // Use bubble-phase click so menu item pointer handlers run first.
    document.addEventListener("click", onPointerDown);
    return () => document.removeEventListener("click", onPointerDown);
  }, [enabled, onOutside]);
}

export interface DashboardMenuItem {
  id: string;
  label: string;
  destructive?: boolean;
  onSelect?: () => void;
}

export interface DashboardMenuPopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  items: DashboardMenuItem[];
  align?: "left" | "right";
  /** Where the menu opens relative to the trigger. `auto` flips up near the viewport bottom. */
  placement?: "bottom" | "top" | "auto";
  className?: string;
  children?: React.ReactNode;
}

/** Dark floating menu — export / row actions / page size. */
export function DashboardMenuPopover({
  open,
  onClose,
  anchorRef,
  items,
  align = "right",
  placement = "bottom",
  className,
  children,
}: DashboardMenuPopoverProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(
    null,
  );

  const updatePosition = React.useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = panel?.offsetWidth ?? 200;
    const height = panel?.offsetHeight ?? 120;
    const gap = 8;
    const left =
      align === "right"
        ? Math.max(8, rect.right - width)
        : Math.min(window.innerWidth - width - 8, rect.left);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let openUp = placement === "top";
    if (placement === "auto") {
      openUp = spaceBelow < height + gap && spaceAbove > spaceBelow;
    }

    const top = openUp
      ? Math.max(8, rect.top - height - gap)
      : rect.bottom + gap;

    setCoords({ top, left });
  }, [align, anchorRef, placement]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // Re-measure after paint so panel height is accurate for upward placement.
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  useEscape(onClose, open);
  useClickOutside([anchorRef, panelRef], onClose, open);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "fixed z-[80] min-w-[140px] rounded-xl border border-[#2D2D30] bg-[#121212] px-4 py-3 shadow-xl",
        className,
      )}
      style={
        coords
          ? { top: coords.top, left: coords.left }
          : { visibility: "hidden" as const }
      }
    >
      {children ?? (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="menuitem"
                onPointerDown={(event) => {
                  // Select on pointerdown so navigation isn't lost to outside-close races.
                  event.preventDefault();
                  event.stopPropagation();
                  item.onSelect?.();
                  onClose();
                }}
                className={cn(
                  "w-full text-left font-sans text-[12px] font-normal uppercase leading-none tracking-[-0.02em] transition-opacity hover:opacity-80",
                  item.destructive ? "text-[#FF4D4D]" : "text-[#FDFDFF]",
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}

export interface DashboardModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  widthClassName?: string;
}

/** Centered dark modal — save view / confirm dialogs. */
export function DashboardModal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  widthClassName = "max-w-md",
}: DashboardModalProps) {
  useEscape(onClose, open);

  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-[1] w-full rounded-xl border border-[#2D2D30] bg-[#121212] p-5 shadow-2xl sm:p-6",
          widthClassName,
          className,
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-sans text-[16px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF] md:text-[18px]">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
        {footer ? <div className="mt-6 flex items-center justify-end gap-3">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export interface DashboardDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  widthClassName?: string;
}

/** Right-side filters drawer. */
export function DashboardDrawer({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  widthClassName = "max-w-md",
}: DashboardDrawerProps) {
  useEscape(onClose, open);

  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label="Close drawer backdrop"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-[#2D2D30] bg-[#0D0D0D] shadow-2xl",
          widthClassName,
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#2D2D30] px-5 py-4">
          <h2 className="font-sans text-[16px] font-[590] uppercase leading-none tracking-[-0.02em] text-[#FDFDFF]">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#959597] transition-colors hover:bg-white/5 hover:text-[#FDFDFF]"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-hidden">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-[#2D2D30] px-5 py-4">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
