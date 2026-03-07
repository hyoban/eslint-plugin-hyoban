# md-one-sentence-per-line

Wrap markdown paragraphs so each sentence is on its own line.

## Why

Putting one sentence per line makes diffs cleaner, improves review readability, and makes reflowing text less painful.

## Rule Behavior

- Splits sentences using `Intl.Segmenter` with `granularity: 'sentence'`.
- Inserts a newline between sentence boundaries when there is no existing line break.
- Applies to all paragraphs, including those inside blockquotes and list items.

## Options

- `ignorePatterns`: an array of regular expression source strings. Sentence boundaries immediately following matching text are ignored.

For example, to ignore GitHub-style admonition markers:

```json
{
  "hyoban/md-one-sentence-per-line": ["error", {
    "ignorePatterns": ["^\\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\\]$"]
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
