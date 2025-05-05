
export class ParseError {

  constructor(tok, expected, id) {
    this.tok = tok;
    this.expected = expected;
    this.id = id;
  }

}