// In-memory dismissed set — MVP shortcut (resets on server restart)
const dismissedIds = new Set<string>();

export function dismiss(id: string): void {
  dismissedIds.add(id);
}

export function isDismissed(id: string): boolean {
  return dismissedIds.has(id);
}
