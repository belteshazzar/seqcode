
import fs from 'node:fs'
import { describe, test, expect } from 'vitest'
import { createSVGWindow } from 'svgdom';
import { registerWindow } from '@svgdotjs/svg.js'
import seqcode from '../src/main.js';

const window = createSVGWindow();
const document = window.document;
registerWindow(window, document);

// Golden workflow: rendered SVGs are compared against the committed files in
// tests/output/. On an intentional rendering change, regenerate with
//   UPDATE_GOLDENS=1 npm test
// and review the git diff of tests/output/ before committing.
const UPDATE_GOLDENS = process.env.UPDATE_GOLDENS === '1'

// svg.js assigns globally-incrementing element ids (e.g. SvgjsLinearGradient1006)
// whose values depend on how many elements were created earlier in the process,
// i.e. on test execution order. Rename each unique id to a stable sequential one
// (by first appearance, per type) so goldens are order-independent. The result
// is still a valid SVG, so committed goldens stay viewable.
function normalizeIds(svg) {
  const map = new Map();
  const counters = new Map();
  return svg.replace(/Svgjs([A-Za-z]+?)(\d+)/g, (m, type) => {
    if (!map.has(m)) {
      const n = counters.get(type) ?? 0;
      counters.set(type, n + 1);
      map.set(m, `Svgjs${type}${1000 + n}`);
    }
    return map.get(m);
  });
}

// Parse errors each corpus input is expected to produce, as {id, line}
// (line is null when the error has no token, e.g. at EOF).
// Inputs not listed here must produce no errors at all.
const EXPECTED_ERRORS = {
  'later': [{ id: 9, line: 5 }, { id: 9, line: 13 }],
  'no-call': [{ id: 6, line: null }, { id: 8, line: null }],
  'no-classifier': [{ id: 4, line: null }],
  'open-body': [{ id: 13, line: null }],
  'simple-example': [{ id: 9, line: 2 }],
  'simplest': [{ id: 9, line: 1 }, { id: 9, line: 3 }],
  'single-ident': [{ id: 8, line: null }],
  'from-string-test1': [{ id: 8, line: null }],
}

function check(name, source) {
  const { svg, errors } = seqcode(source, { fontFamily: 'sans-serif' });

  const actualErrors = (errors ?? []).map(e => e.internal
    ? { internal: true, message: e.message }
    : { id: e.id, line: e.tok ? e.tok.line : null });
  expect(actualErrors).toEqual(EXPECTED_ERRORS[name] ?? []);

  const str = svg.svg();
  expect(str.length).toBeGreaterThan(0);
  expect(str).toMatch(/width="\d+"/);
  expect(str).toMatch(/height="\d+"/);
  expect(str).not.toContain('NaN');

  const actual = normalizeIds(str);
  const goldenPath = `tests/output/${name}.svg`;
  if (UPDATE_GOLDENS || !fs.existsSync(goldenPath)) {
    fs.writeFileSync(goldenPath, actual, { encoding: 'utf8' });
  } else {
    const golden = normalizeIds(fs.readFileSync(goldenPath, 'utf8'));
    expect(actual).toBe(golden);
  }
}

describe.each(
  fs.readdirSync('./tests/input').map(file => file.replace('.seqcode', ''))
)('svg from source', (f) => {

  test(f, () => {
    // test with sans-serif as we haven't loaded fonts into
    // svgdom which it would need to measure text
    const txt = fs.readFileSync(`./tests/input/${f}.seqcode`, 'utf8');
    check(f, txt);
  })

})

describe('from string', () => {
  test('test1', () => {
    check('from-string-test1', "bob");
  })

  test('create-width', () => {
    check('from-string-create-width', "frame(x){me:actor\nb:Object\na:Object\na.test() { state(label) }\na.create()}");
  })
})
