
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { describe, test, expect } from 'vitest'

const CLI = path.resolve('bin/seqcode.js')

function runCli(args) {
  // stderr piped so CLI progress/errors don't pollute test output
  return execFileSync(process.execPath, [CLI, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'seqcode-cli-'))
}

describe('cli', () => {

  test('renders a .seqcode file to an svg of the same name', () => {
    const dir = tmpDir()
    const input = path.join(dir, 'diagram.seqcode')
    fs.writeFileSync(input, 'a.do()')

    runCli([input])

    const svg = fs.readFileSync(path.join(dir, 'diagram.svg'), 'utf8')
    expect(svg).toContain('<svg')
    expect(svg).toMatch(/width="\d+"/)
    fs.rmSync(dir, { recursive: true, force: true })
  })

  test('fails with usage when no arguments given', () => {
    expect(() => runCli([])).toThrow()
  })

  test('still writes the svg when the script has parse errors', () => {
    const dir = tmpDir()
    const input = path.join(dir, 'bad.seqcode')
    fs.writeFileSync(input, 'bob')

    runCli([input]) // parse errors are reported but don't fail the run

    expect(fs.existsSync(path.join(dir, 'bad.svg'))).toBe(true)
    fs.rmSync(dir, { recursive: true, force: true })
  })

  test('exits non-zero for a missing input file', () => {
    expect(() => runCli(['/nonexistent/nope.seqcode'])).toThrow()
  })

})
