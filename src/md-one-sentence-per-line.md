# md-one-sentence-per-line

Wrap markdown paragraphs so each sentence is on its own line.

## Why

Putting one sentence per line makes diffs cleaner, improves review readability, and makes reflowing text less painful.

## Rule Behavior

- Splits sentences using `Intl.Segmenter` with `granularity: 'sentence'`.
- Inserts a newline between sentence boundaries when there is no existing line break.
- Only applies to top-level paragraphs (`root > paragraph > text`), so blockquotes and list items are left as-is.

## Options

This rule has no options.

## Example

Input:

```md
Hello world. This is a test.

> Quoted. Sentence.

- Item. Sentence.
```

Output:

```md
Hello world.
This is a test.

> Quoted. Sentence.

- Item. Sentence.
```

## Read More

https://nick.groenen.me/notes/one-sentence-per-line
