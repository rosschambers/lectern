import { Graphviz } from '@hpcc-js/wasm-graphviz';
import { describe, expect, it } from 'vitest';

describe('graphviz svg output contract', () => {
  it('still emits the default-color attributes the theme selectors target', async () => {
    const graphviz = await Graphviz.load();
    const svg = graphviz.layout('digraph { a [color=red]; a -> b }', 'svg', 'dot');
    expect(svg).toMatch(/<g id="graph0" class="graph"[^>]*>\s*(?:<title>[^<]*<\/title>\s*)?<polygon fill="white" stroke="none"/);
    expect(svg).toContain('stroke="black"');
    expect(svg).toContain('fill="black"');
    expect(svg).toContain('stroke="red"');
    expect(svg).toMatch(/<text(?![^>]*\bfill=)[^>]*>b<\/text>/);
  });
});
