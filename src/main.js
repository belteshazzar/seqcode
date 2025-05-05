
import { tokenize } from './tokenize.js';
import { parse } from './parse.js';

import graph from './graph.js';

export default function (text, cb) {
  const g = new ckwnc.Graphics({
    fontWeight: 100,
    fontSize: 10,
    fontFace: '"Century Gothic", CenturyGothic, AppleGothic, sans-serif',
    background: "white",
    foreground: "black",
    dashStyle: [8, 5],
    gradLight: "#eee",
    gradDark: "#ddd",
    arrowSize: 7,
    margin: 30,
    rowSpacing: 40,
    objectSpacing: 50,
    areaPadding: 15,
    refCallback: cb
  });

  const toks = tokenize(text);
  const p = parse(toks);
  const graph = graph(p.objects, p.rootCall, g);
  return g.getElement();
}