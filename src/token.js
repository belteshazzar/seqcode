
export class Token {

  constructor(line, col, type, str) {
    this.line = line;
    this.col = col;
    this.type = type;
    this.str = str;
  }
}

export const IDENT = -1;
export const BRACE_OPEN = 1;
export const BRACE_CLOSE = 2;
//export const BRACKET_OPEN = 3;  - replaced by PARAMS
//export const BRACKET_CLOSE = 4; - replaced by PARAMS
export const CALL = 5;
export const SIGNAL = 6;
export const CLASSIFIER = 7;
export const PARAMS = 8;