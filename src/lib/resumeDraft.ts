/** Hands a resume made in the AI writer back to the apply screen. */
export type DraftFile = { uri: string; name: string; mimeType: string };
let draft: DraftFile | null = null;
export const setDraftResume = (f: DraftFile | null) => {
  draft = f;
};
export const takeDraftResume = () => {
  const d = draft;
  draft = null;
  return d;
};
