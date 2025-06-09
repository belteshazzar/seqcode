# SeqCode

**UML sequence diagrams automatically translated from simple code**

SeqCode (pronounced "seek code") is an easy to learn script in the style of a simple procedural programming language that is automatically translated into UML sequence diagrams.

This is a tool designed for programmers that want to capture the logic rather than mess with a modelling or drawing application.

The following shows an example script and the resulting SVG diagram:

<pre><code>a.get() {
    b > msg {
        db.store()
    }
}
c.destroy()

note( 60, 300, 280, seqcode - UML sequence diagrams automatically translated from simple code.)</code></pre>

![Example seqcode diagram](/tests/output/simple-example.svg "Example seqcode diagram")

For a live demonstration visit: https://seqcode.app

This repo contains the npm package that performs the script parsing, layout and svg generation. It can be used in node and in the browser.

SeqCode is licensed under the terms of the BSD 2-Clause License.

## Installation

`npm install seqcode`

## Usage

```javascript
import seqcode from "seqcode";

const {svg,errors} = seqcode("a.do()", { /* options */ });
if (errors) console.error(errors)
const str = svg.svg()    // string of svg source
const element = svg.node // HTML Element
```

### Node Dependencies

In a nodejs environment you need to create the dependencies for SVG creation (the tests do this):

```javascript
import { createSVGWindow } from 'svgdom';
import { registerWindow } from '@svgdotjs/svg.js'

const window = createSVGWindow();
const document = window.document;
registerWindow(window, document);
```

### Options

| Option         | Default   | Type          | Description                                                                       |
| -------------- | --------- | ------------- | --------------------------------------------------------------------------------- |
| foreground     | "black"   | String        | CSS color used for the text, lines, arrows and box outlines.                      |
| background     | "white"   | String        | CSS color used for the background of the diagram.                                 |
| fontFamily     | "verdana" | String        | CSS font-family for all text except notes.                                        |
| fontSize       | 12        | Integer       | Pixel size of the font                                                            |
| fontWeight     | 100       | Integer       | CSS font-weight for all text except notes.                                        |
| fillLight      | "#eee"    | String        | CSS color for the start of the gradient fill in execution boxes and frame labels. |
| fillDark       | "#ddd"    | String        | CSS color for the end of the gradient fill in execution boxes and frame label.    |
| dashStyle      | [8,5]     | Integer Array | Dash style for lines.                                                             |
| arrowSize      | 7         | Integer       | Size in pixels of the arrows                                                      |
| margin         | 30        | Integer       | Margin in pixels used around the diagram.                                         |
| rowSpacing     | 30        | Integer       | Vertical spacing in pixels between messages.                                      |
| objectSpacing  | 5         | Integer       | Horizontal spacing between object life lines in pixels.                           |
| areaPadding    | 15        | Integer       | Padding in pixels added to the interior of frames                                 |
| linkIconColor  | "#999"    | String        | CSS color of the icon added when a note or frame is a link.                       |
| noteForeground | "#0000CD" | String        | CSS color of the font used in notes.                                              |
| noteFontFamily | "verdana" | String        | CSS font-family of the text in notes.                                             |
| noteFontSize   | 12        | Integer       | Size in pixels of the font used in notes.                                         |
| noteFontWeight | 100       | Integer       | CSS font-weight of the ont used in notes.                                         |
| noteLight      | "#FFFDA1" | String        | CSS color for the start of the gradient fill in notes.                            |
| noteDark       | "#FFEB5B" | String        | CSS color of the end of the gradient fill used in notes.                          |
| noteStroke     | "#ccc"    | String        | CSS color of the outline of notes.                                                |
| linkHandler    |           | LinkHandler   | Defines how links are handled.                                                    |

#### LinkHander

The linkHandler option is an object with the properties as per the table below. It is used to control how links in notes and ref frames are handled. 

| Property | Default                                             | Description                                                             |
| -------- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| href     | (link) => "#"                                       | Function that returns the href value for the link element.              |
| target   | (link) => ""                                        | Function that returns the target value for the link element.            |
| onclick  | (link) => \`alert(decodeURI("${encodeURI(link)}"))` | Function that returns the onclick javascript code for the link element. |

### Errors

Errors returned are for information, SeqCode attempts to skip over errors and continue parsing the script.

| Property | Type    | Description                                                            |
| -------- | ------- | ---------------------------------------------------------------------- |
| tok      | Token   | The unexpected token that was found or null if at the end of the file. |
| tok.line | Integer | The line number that the error appears on.                             |
| tok.col  | Integer | The column number that the error appears on.                           |
| tok.type | Integer | The type of token that was found.                                      |
| tok.str  | String  | The string/text value of the token.                                    |
| expected | String  | Message describing what was expected instead of the token found.       |
| id       | Integer | A unique id of the error that was raised, used for internal debugging. |

## Acknowledgements

SVG generation is done using [svg.js](https://github.com/svgdotjs/svg.js)
