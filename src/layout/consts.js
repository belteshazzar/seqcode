
// Line styles are [solid, closedArrowhead] pairs compared by identity.
// call = SOLID CLOSED
export const CALL = [true, true];
// return = DASHED OPEN
export const RETURN = [false, false];
// asynch = SOLID OPEN
export const ASYNCH = [true, false];
// life = DASHED OPEN
export const LIFE = [false, false];
// lost = SOLID OPEN
export const LOST = [true, false];
// found = SOLID OPEN
export const FOUND = [true, false];

export const HIDDEN = [false, false];
export const REF = [false, false];

// invocation width in pixels
export const WIDTH = 20;

// Returns the trimmed string, or false when null/undefined/blank.
export function str(s) {
  if (s == undefined || s == null) return false;
  s = s.trim();
  if (s.length == 0) return false;
  return s;
}
