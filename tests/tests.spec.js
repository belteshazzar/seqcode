
import fs from 'node:fs'
import { describe, expect, test } from 'vitest'
import seqcode from './src/main.js';

describe.each(
  fs.readdirSync('./tests/input').map(file => file.replace('.seqcode', ''))
)('describe generate svg from source', (f) => {

  test('generate without error', () => {
    const txt = fs.readFileSync(`./tests/input/${f}.seqcode`, 'utf8');
    const svg = seqcode(txt);
    fs.writeFileSync(`./tests/output/${f}.svg`, svg, { encoding: 'utf8' })
  })

})