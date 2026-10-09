export function StatusBadge({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span
        aria-hidden="true"
        className={
          online
            ? "h-2 w-2 rounded-full bg-good"
            : "h-2 w-2 rounded-sm bg-critical"
        }
      />
      {online ? "Online" : "Silent"}
    </span>
  );
}
