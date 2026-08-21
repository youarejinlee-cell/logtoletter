export const MAX_ENTRY_TEXT_LENGTH = 500;

export function entryTextLength(value: string) {
  return [...value].length;
}
