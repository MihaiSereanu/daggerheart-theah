import assert from 'node:assert/strict';
import { marked } from 'marked';

const plain = text => text.replace(/[*_]/g, '').trim();
const structural = name => /^(?:STARTING|Thematic|Archetype Feature|Features$|Choose|.*Hope Feature|Background|Connections|SPELLCASTING TRAIT)/i.test(name);
const renderedText = markdown => marked.parse(markdown).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

/** Titles require a Markdown heading or punctuation around a bold name. */
export function parseFeatureBlocks(content) {
    const pattern = /^(?:#{4,5}[ \t]+([^\n]+)|\*\*([^*\n]+[.:])\*\*[ \t]*|\*\*([^*\n]+)\*\*[.:][ \t]*|\*\*([^*\n]+?[-–—][ \t]*(?:Action|Passive|Reaction)):[ \t]*([^*\n]+)\*\*)/gm;
    const starts = [...content.matchAll(pattern)];
    return starts.flatMap((match, index) => {
        const name = plain(match[1] ?? match[2] ?? match[3] ?? match[4]).replace(/[.:]$/, '');
        if (structural(name)) return [];
        const text = (match[5] ?? '') + content.slice(match.index + match[0].length, starts[index + 1]?.index ?? content.length);
        return [{ name, text, identityName: match[5] ? `${name}: ${match[5]}` : name }];
    });
}

/** Independent Markdown-token audit: compare every declaration and its complete body. */
export function auditFeatureBlocks(content, parsed, source) {
    const tokens = marked.lexer(content);
    const declarations = tokens.flatMap((token, index) => {
        if (token.type === 'heading' && [4, 5].includes(token.depth)) {
            return [{ index, name: plain(token.text).replace(/[.:]$/, ''), body: '' }];
        }
        const first = token.type === 'paragraph' ? token.tokens?.[0] : null;
        if (first?.type !== 'strong' || !token.raw.startsWith('**')) return [];
        const tail = token.raw.slice(first.raw.length);
        const malformed = first.text.match(/^(.+?[-–—]\s*(?:Action|Passive|Reaction)):\s*(.+)$/);
        if (malformed) return [{ index, name: plain(malformed[1]), body: malformed[2] + tail }];
        if (!/[.:]$/.test(first.text) && !/^[.:]/.test(tail)) return [];
        return [{ index, name: plain(first.text).replace(/[.:]$/, ''), body: tail.replace(/^[.:][ \t]*/, '') }];
    });
    const expected = declarations.flatMap((entry, index) => {
        if (structural(entry.name)) return [];
        const end = declarations[index + 1]?.index ?? tokens.length;
        return [{ name: entry.name, text: entry.body + tokens.slice(entry.index + 1, end).map(t => t.raw).join('') }];
    });
    assert.deepEqual(parsed.map(f => f.name), expected.map(f => f.name), `Feature declarations: ${source}`);
    for (const [index, feature] of parsed.entries()) {
        assert.ok(renderedText(feature.text), `Empty Feature: ${source} / ${feature.name}`);
        assert.equal(renderedText(feature.text), renderedText(expected[index].text), `Feature rules: ${source} / ${feature.name}`);
    }
    return { source, verified: true, features: parsed.map(f => f.name) };
}
