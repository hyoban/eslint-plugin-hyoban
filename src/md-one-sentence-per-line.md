# md-one-sentence-per-line

Wrap markdown paragraphs so each sentence is on its own line.

## Why

Putting one sentence per line makes diffs cleaner, improves review readability, and makes reflowing text less painful.

## Rule Behavior

- Splits sentences using `Intl.Segmenter` with `granularity: 'sentence'`.
- Inserts a newline between sentence boundaries when there is no existing line break.
- Applies to all paragraphs, including those inside blockquotes and list items.

## Options

- By default, the rule ignores GitHub alert paragraphs that start with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, or `[!CAUTION]`, allowing any text inside those paragraphs.
- `ignorePatterns`: an array of additional regular expression source strings. Patterns are matched against the full paragraph text (which may include embedded newlines, such as GitHub alert content). If any built-in or custom pattern matches that paragraph text, the rule skips that paragraph.

For example, to add your own ignored paragraph pattern:

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
