export function classifyStartup(
  markerPresent: boolean,
  bootIdChanged: boolean,
): string {
  if (markerPresent && !bootIdChanged) {
    return "clean-restart";
  }

  if (markerPresent && bootIdChanged) {
    return "clean-reboot";
  }

  if (!markerPresent && !bootIdChanged) {
    return "agent-crashed";
  }

  return "unclean-reboot";
}
