import { describe, expect, it } from 'vitest';
import { createSlugger, slugify } from './slug';

describe('slugify', () => {
  it('matches GitHub anchors', () => {
    expect(slugify('Add Exocortex Project')).toBe('add-exocortex-project');
    expect(slugify('Step 4: Secrets .gitignore (if needed)')).toBe('step-4-secrets-gitignore-if-needed');
    expect(slugify('Café Über')).toBe('café-über');
    expect(slugify('snake_case name')).toBe('snake_case-name');
    expect(slugify('A -- B')).toBe('a----b');
  });
});

describe('createSlugger', () => {
  it('deduplicates and never returns an empty id', () => {
    const uniqueSlug = createSlugger();
    expect([uniqueSlug('Overview'), uniqueSlug('Overview'), uniqueSlug('Overview')]).toEqual(['overview', 'overview-1', 'overview-2']);
    expect(uniqueSlug('!!!')).toBe('section');
  });
});
