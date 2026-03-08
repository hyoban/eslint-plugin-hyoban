# md-one-sentence-per-line

Wrap markdown paragraphs so each sentence is on its own line.

## Why

Putting one sentence per line makes diffs cleaner, improves review readability, and makes reflowing text less painful.

## Rule Behavior

- Splits sentences using `Intl.Segmenter` with `granularity: 'sentence'`.
- Inserts a newline between sentence boundaries when there is no existing line break.
- Applies to all paragraphs, including those inside blockquotes and list items.

## Options

- By default, the rule ignores GitHub alert-style marker lines like `[!NOTE]` or `[!CUSTOM]`, while still checking the remaining alert content normally.
- `ignorePatterns`: an array of additional regular expression source strings. These patterns are matched against the full paragraph text, and only the matched text is ignored when deciding whether a sentence boundary should be wrapped.

For example, to ignore a custom alert marker:

```json
{
  "hyoban/md-one-sentence-per-line": ["error", {
    "ignorePatterns": ["^\\[!CUSTOM\\]"]
  }]
}
```

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

> Quoted.
Sentence.

- Item.
Sentence.
```

## Read More

https://nick.groenen.me/notes/one-sentence-per-line
