/**
 * Shows a browser confirmation before deleting persisted data.
 *
 * @param targetName - Human-readable target name shown in the confirmation.
 * @param detail - Optional extra warning text.
 * @returns True when the user confirmed deletion.
 */
export function confirmDelete(targetName: string, detail = "This action cannot be undone.") {
  return window.confirm(`Are you sure you want to delete ${targetName}?\n\n${detail}`);
}
