export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-full flex-col items-start justify-center gap-3 p-6 sm:p-10">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
        Dark Horse Display
      </p>
      <h2 className="text-2xl font-bold uppercase tracking-[0.06em] text-foreground">
        {title}
      </h2>
      <p className="max-w-lg text-xs font-medium uppercase tracking-[0.06em] text-foreground-muted">
        {description ??
          "Module shell is ready. Connect APIs and screens for this section next."}
      </p>
    </div>
  );
}
