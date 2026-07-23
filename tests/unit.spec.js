
import { describe, test, expect } from 'vitest'
import { MarkGrid } from '../src/layout/grid.js'
import { buildNodes } from '../src/layout/nodes.js'
import { str } from '../src/layout/consts.js'

function gridWith(cols) {
  const objs = Array.from({ length: cols }, (_, i) => ({ objIndex: i, marks: [] }));
  return { grid: new MarkGrid(objs), objs };
}

describe('MarkGrid', () => {

  test('marks a free row and returns it', () => {
    const { grid, objs } = gridWith(3);
    expect(grid.markN(objs[0], objs[2], 1, 1)).toBe(1);
    expect(objs[0].marks[1]).toBe('X');
    expect(objs[1].marks[1]).toBe('X');
    expect(objs[2].marks[1]).toBe('X');
    expect(grid.maxY).toBe(1);
  });

  test('skips occupied rows', () => {
    const { grid, objs } = gridWith(2);
    grid.markN(objs[0], objs[1], 1, 1);
    expect(grid.markN(objs[0], objs[1], 1, 1)).toBe(2);
  });

  test('columns outside the span are independent', () => {
    const { grid, objs } = gridWith(3);
    grid.markN(objs[0], objs[0], 1, 1);
    // columns 1..2 are still free at row 1
    expect(grid.markN(objs[1], objs[2], 1, 1)).toBe(1);
  });

  test('markN requires n consecutive free rows', () => {
    const { grid, objs } = gridWith(2);
    grid.markN(objs[0], objs[1], 2, 1); // occupy row 2
    // rows 1..3 are not all free (2 is taken), first run of 3 starts at 3
    expect(grid.markN(objs[0], objs[1], 1, 3)).toBe(3);
    expect(objs[0].marks[3]).toBe('X');
    expect(objs[0].marks[4]).toBe('X');
    expect(objs[0].marks[5]).toBe('X');
    expect(grid.maxY).toBe(5);
  });

  test('argument order does not matter', () => {
    const { grid, objs } = gridWith(3);
    grid.markN(objs[2], objs[0], 1, 1);
    expect(objs[1].marks[1]).toBe('X');
  });

  test('leftRight rejects missing and non-numeric arguments', () => {
    const { grid, objs } = gridWith(2);
    expect(() => grid.leftRight(undefined, objs[1], 1)).toThrow(/missing argument/);
    expect(() => grid.leftRight({ objIndex: NaN }, objs[1], 1)).toThrow(/non-numeric/);
  });

});

describe('Note.parseParams', () => {

  const { Note } = buildNodes({ objs: [], grid: null, lines: [], invocations: [], notes: [], g: null });

  test('parses x, y, w and text', () => {
    expect(Note.parseParams('10, 20, 300, hello world')).toEqual(
      { x: 10, y: 20, w: 300, text: ' hello world' });
  });

  test('text keeps embedded commas', () => {
    expect(Note.parseParams('1,2,3,a,b,c').text).toBe('a,b,c');
  });

  test('rejects too few parts', () => {
    expect(Note.parseParams('10, 20, 300')).toBeNull();
  });

  test('rejects non-numeric coordinates', () => {
    expect(Note.parseParams('x, 20, 300, hello')).toBeNull();
    expect(Note.parseParams('10, 20, 3.5x, hello')).toBeNull();
  });

});

describe('trailing return()/later{} extraction', () => {

  function build() {
    // one object; enough Obj surface for constructing nodes (layout not run)
    const objs = [{ objIndex: 0, alive: null, marks: [] }];
    const ctx = { objs, grid: new MarkGrid(objs), lines: [], invocations: [], notes: [], g: null };
    return buildNodes(ctx);
  }

  const parentStub = () => ({ objIndex: 0, frames: [], inFrame: false, labels: [], lines: [], level: 0 });
  const call = (name, params, subCalls = []) => ({ objIndex: 0, name, params, isAsynch: false, subCalls });

  test('trailing return(x) becomes returns and leaves the node list', () => {
    const N = build();
    const [msg] = N.createNodes(parentStub(), [
      call('work', '', [call('step', ''), call('return', '42')]),
    ]);
    expect(msg.returns).toBe('42');
    expect(msg.nodes.length).toBe(1);
    expect(msg.nodes[0].name).toBe('step');
  });

  test('trailing later{} blocks are pulled into later[]', () => {
    const N = build();
    const [msg] = N.createNodes(parentStub(), [
      call('work', '', [call('step', ''), call('later', '', [call('cleanup', '')])]),
    ]);
    expect(msg.later.length).toBe(1);
    expect(msg.later[0].islater).toBe(true);
    expect(msg.nodes.length).toBe(1);
  });

  test('non-trailing return stays a normal self message', () => {
    const N = build();
    const [msg] = N.createNodes(parentStub(), [
      call('work', '', [call('return', '42'), call('step', '')]),
    ]);
    expect(msg.returns).toBeUndefined();
    expect(msg.nodes.length).toBe(2);
  });

});

describe('str', () => {

  test('returns trimmed content', () => {
    expect(str('  a  ')).toBe('a');
  });

  test('returns false for null, undefined and blank', () => {
    expect(str(null)).toBe(false);
    expect(str(undefined)).toBe(false);
    expect(str('   ')).toBe(false);
  });

});
