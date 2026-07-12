import { extractJson } from './openrouter-invoice-parser.provider';

describe('extractJson', () => {
  it('unwraps ```json fences (deepseek style)', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it('unwraps bare ``` fences', () => {
    expect(extractJson('```\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it('strips prose surrounding the object', () => {
    expect(extractJson('Here is the JSON: {"a":1} — done')).toBe('{"a":1}');
  });
  it('passes clean JSON through unchanged', () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}');
  });
  it('yields parseable JSON from a fenced multi-field payload', () => {
    expect(JSON.parse(extractJson('```json\n{"currency":"EUR","lines":[]}\n```')))
      .toEqual({ currency: 'EUR', lines: [] });
  });
});
