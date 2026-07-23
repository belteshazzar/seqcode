
// An internal error raised during layout or drawing. Unlike ParseError it
// does not point at a source token; `internal: true` distinguishes the two
// shapes in the errors array returned by seqcode().
export class LayoutError {

  constructor(message, cause) {
    this.internal = true;
    this.message = message;
    this.cause = cause;
  }

}
