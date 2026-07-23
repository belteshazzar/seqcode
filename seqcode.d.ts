declare module "seqcode" {

  import type { Svg } from "@svgdotjs/svg.js";

  export interface LinkHandler {
    /** Returns the href value for the link element. */
    href?: (link: string) => string;
    /** Returns the target value for the link element. */
    target?: (link: string) => string;
    /** Returns the onclick javascript code for the link element. */
    onclick?: (link: string) => string;
  }

  export interface SeqcodeOptions {
    /** CSS color used for the text, lines, arrows and box outlines. Default "black". */
    foreground?: string;
    /** CSS color used for the background of the diagram. Default "white". */
    background?: string;
    /** CSS font-family for all text except notes. Default "verdana". */
    fontFamily?: string;
    /** Pixel size of the font. Default 12. */
    fontSize?: number;
    /** CSS font-weight for all text except notes. Default 100. */
    fontWeight?: number;
    /** CSS color for the start of the gradient fill in execution boxes and frame labels. Default "#eee". */
    fillLight?: string;
    /** CSS color for the end of the gradient fill in execution boxes and frame labels. Default "#ddd". */
    fillDark?: string;
    /** Dash style for lines. Default [8, 5]. */
    dashStyle?: number[];
    /** Size in pixels of the arrows. Default 7. */
    arrowSize?: number;
    /** Margin in pixels used around the diagram. Default 30. */
    margin?: number;
    /** Vertical spacing in pixels between messages. Default 30. */
    rowSpacing?: number;
    /** Horizontal spacing between object life lines in pixels. Default 5. */
    objectSpacing?: number;
    /** Padding in pixels added to the interior of frames. Default 15. */
    areaPadding?: number;
    /** CSS color of the icon added when a note or frame is a link. Default "#999". */
    linkIconColor?: string;
    /** CSS color of the font used in notes. Default "#0000CD". */
    noteForeground?: string;
    /** CSS font-family of the text in notes. Default "verdana". */
    noteFontFamily?: string;
    /** Size in pixels of the font used in notes. Default 12. */
    noteFontSize?: number;
    /** CSS font-weight of the font used in notes. Default 100. */
    noteFontWeight?: number;
    /** CSS color for the start of the gradient fill in notes. Default "#FFFDA1". */
    noteLight?: string;
    /** CSS color of the end of the gradient fill used in notes. Default "#FFEB5B". */
    noteDark?: string;
    /** CSS color of the outline of notes. Default "#ccc". */
    noteStroke?: string;
    /** Defines how links in notes and ref frames are handled. */
    linkHandler?: LinkHandler;
  }

  export interface Token {
    line: number;
    col: number;
    type: number;
    str: string;
  }

  /** A script parsing error pointing at the offending token. */
  export interface ParseError {
    /** The unexpected token, or null if at the end of the file. */
    tok: Token | null;
    /** Message describing what was expected instead of the token found. */
    expected: string;
    /** A unique id of the error that was raised, used for internal debugging. */
    id: number;
  }

  /** An internal error raised during layout or drawing. */
  export interface LayoutError {
    /** Always true; distinguishes layout errors from parse errors. */
    internal: true;
    /** Description of the failure. */
    message: string;
    /** The underlying exception, when one was caught. */
    cause?: unknown;
  }

  export type SeqcodeError = ParseError | LayoutError;

  export interface SeqcodeResult {
    /** The rendered diagram; call .svg() for source or use .node for the element. */
    svg: Svg;
    /** Errors encountered while parsing/laying out, or null if none. */
    errors: SeqcodeError[] | null;
  }

  /** Parses a seqcode script and renders it as an SVG sequence diagram. */
  export default function seqcode(text: string, options?: SeqcodeOptions): SeqcodeResult;

}
