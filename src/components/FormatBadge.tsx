import { useMemo } from "react";
import { getFormatBadge } from "../formats/registry";

export function FormatBadge({ path }: { path: string }) {
  const badge = useMemo(() => getFormatBadge(path), [path]);

  if (!badge) return null;

  return (
    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${badge.color}`}>
      {badge.label}
    </span>
  );
}

export { getFormatBadge };
