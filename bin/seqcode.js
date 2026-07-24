#!/usr/bin/env node

// Renders .seqcode files to SVG files of the same name (foo.seqcode -> foo.svg).

import fs from 'node:fs';

function usage() {
  console.error('Usage: seqcode <file.seqcode> [more files...]');
  console.error('');
  console.error('Renders each script to an SVG next to it with the same name');
  console.error('(diagram.seqcode -> diagram.svg).');
}

async function loadSeqcode() {
  // In the repo, prefer the source entry point so the CLI never runs a
  // stale build; the published package ships dist/ only, so fall back.
  try {
    return (await import('../src/main.js')).default;
  } catch {
    return (await import('../dist/seqcode.js')).default;
  }
}

async function setupDom() {
  let svgdom;
  try {
    svgdom = await import('svgdom');
  } catch {
    console.error('The seqcode CLI needs the optional dependency "svgdom" to render SVGs in Node.');
    console.error('Install it with: npm install svgdom');
    process.exit(1);
  }
  const { registerWindow } = await import('@svgdotjs/svg.js');
  const window = svgdom.createSVGWindow();
  registerWindow(window, window.document);
}

function outputPath(file) {
  return file.endsWith('.seqcode')
    ? file.slice(0, -'.seqcode'.length) + '.svg'
    : file + '.svg';
}

function reportError(file, e) {
  if (e.internal) {
    console.error(`${file}: layout error: ${e.message}`);
  } else if (e.tok) {
    console.error(`${file}:${e.tok.line}:${e.tok.col}: ${e.expected}`);
  } else {
    console.error(`${file}: ${e.expected}`);
  }
}

const files = process.argv.slice(2);

if (files.length === 0 || files.includes('-h') || files.includes('--help')) {
  usage();
  process.exit(files.length === 0 ? 1 : 0);
}

await setupDom();
const seqcode = await loadSeqcode();

let failed = false;

for (const file of files) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    console.error(`${file}: ${e.message}`);
    failed = true;
    continue;
  }

  const { svg, errors } = seqcode(text, {});
  if (errors) {
    for (const e of errors) reportError(file, e);
  }

  const out = outputPath(file);
  fs.writeFileSync(out, svg.svg(), { encoding: 'utf8' });
  console.error(`${file} -> ${out}`);
}

process.exit(failed ? 1 : 0);
