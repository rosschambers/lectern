import { describe, expect, it } from 'vitest';
import { splitFrontmatter } from './frontmatter';

const lineFeedSource = '---\nname: lectern\ndescription: reader\n---\n# Title\n';

describe('splitFrontmatter', () => {
  it('splits leading YAML from the body', () => {
    expect(splitFrontmatter(lineFeedSource)).toEqual({ frontmatter: 'name: lectern\ndescription: reader', body: '# Title\n' });
  });

  it('treats CRLF like LF', () => {
    const result = splitFrontmatter(lineFeedSource.replace(/\n/g, '\r\n'));
    expect(result.frontmatter).toBe('name: lectern\ndescription: reader');
    expect(result.body).toBe('# Title\r\n');
  });

  it('accepts a dot-dot-dot terminator and a byte-order mark', () => {
    expect(splitFrontmatter('\uFEFF---\na: 1\n...\nbody').frontmatter).toBe('a: 1');
  });

  it('returns null when absent or unclosed', () => {
    expect(splitFrontmatter('# Title\n---\n')).toEqual({ frontmatter: null, body: '# Title\n---\n' });
    expect(splitFrontmatter('---\na: 1\nno close')).toEqual({ frontmatter: null, body: '---\na: 1\nno close' });
  });

  it('keeps empty frontmatter distinct from none', () => {
    expect(splitFrontmatter('---\n---\nbody')).toEqual({ frontmatter: '', body: 'body' });
  });
});
