# Wiki Batch Import

## Compatibility and Storage

The original format remains supported without a version field or conversion step:

```json
{
  "pages": [
    {
      "title": "Topic",
      "slug": "topic",
      "summary": "A short introduction.",
      "lead": ["Full introductory text."],
      "infobox": { "Area": "Computer science" },
      "sections": [
        {
          "heading": "Definition",
          "paragraphs": ["The complete explanation."],
          "list": ["First point", "Second point"],
          "steps": ["First step", "Second step"]
        }
      ],
      "seeAlso": [],
      "references": [],
      "sources": [],
      "externalLinks": [],
      "quizQuestions": [],
      "flashcards": [],
      "children": []
    }
  ]
}
```

A direct array of page objects is also accepted, as before. Children use the same page format recursively. Existing `table`, `code`, `quote`, nested `sections`, links, source fields and legacy aliases remain supported. Quiz options still use `text` and boolean `isCorrect`; flashcards still use `front` and `back`.

All additions below are optional. Existing string lists do not need to become objects. Do not replace your previous prompt unless you want it to generate the new elements.

The browser's Wiki batch importer converts structured content to the existing `contentMarkdown` field before calling the API. No database schema changes or data rewrites are required. The existing backup archive still includes the article Markdown, checks, sources, local images and study history. Rich blocks are Markdown containers, not a separate storage format. The API's ordinary page creation/update contract remains unchanged.

If a page has non-empty `contentMarkdown`, that content takes precedence over structured article fields, exactly as before. Sources, quizzes, flashcards and children still import independently. Do not mix raw Markdown and structured sections expecting the importer to concatenate them.

The importer does not summarize, rewrite or generate your learning material. It preserves the supplied text and ordering. Formatting is shared across the article, editor preview and printable PDF. In older application versions, new Markdown containers may appear as plain text; old JSON and old articles remain supported by the updated application.

## Nested Lists and Steps

`list` and `steps` accept strings or objects with `text` and optional nested `items`. The old `bullets` and `orderedList` aliases still work. Nested items inherit the list's unordered/ordered style. Nesting is limited to 20 levels.

```json
{
  "heading": "Reasoning process",
  "list": [
    "State the problem in your own words.",
    {
      "text": "Clarify constraints",
      "items": [
        "Can inputs be empty?",
        { "text": "Check numeric assumptions", "items": ["Negative values", "Overflow"] }
      ]
    }
  ],
  "steps": [
    { "text": "Choose an approach", "items": ["State the invariant", "Explain why it holds"] },
    "Trace the solution on a small input."
  ]
}
```

## Definitions, Checklists and Takeaways

These fields can be placed directly in a section. They are also available as block types in `blocks`.

```json
{
  "heading": "Core concepts",
  "definitions": [
    {
      "term": "Invariant",
      "definition": "A property that stays true throughout the algorithm. Explain both its meaning and its role."
    }
  ],
  "checklist": [
    "Explain the mechanism without looking at the article.",
    { "text": "Identify the main tradeoff.", "checked": false }
  ],
  "takeaways": [
    "Know what changes and what remains invariant.",
    "Connect the definition to a concrete example."
  ]
}
```

Checklist markers are read-only article content, not scored answers or saved habit checkboxes. To edit them, edit the article source. Quiz/flashcard practice remains the only scored Wiki study activity.

Definitions support inline Markdown and longer Markdown explanations. Expand abbreviations in the definition instead of replacing the original source explanation with an unexplained acronym.

## Ordered Learning Blocks

Use `blocks` inside a section when exact ordering matters. Plain strings and the existing `heading`, `section`, `quote`, `list`, `steps`, `ordered-list`, `table` and `code` blocks still work. Sections retain their original fixed field order; `blocks` are rendered after those fields and before nested sections. Optional page-level `blocks` appear after the lead and before sections.

### Callout

Supported `kind` values: `note`, `tip`, `important`, `warning`, `pitfall`. Optional titles can distinguish a definition, an interview signal or a common misconception. Content can use `text`, `paragraphs`, `quote`, `list`, `steps`, `table`, `code` and nested `blocks`.

```json
{
  "type": "callout",
  "kind": "pitfall",
  "title": "Average case is not worst case",
  "paragraphs": [
    "A hash table typically has constant-time average lookup, but collisions can affect the worst case.",
    "Always state which complexity bound you mean."
  ]
}
```

### Worked Example

Use optional `input`, `output` and `explanation` alongside the same content fields supported by callouts. A trace is usually more useful than a result alone. `code.content` is a normal JSON string with newline escapes.

```json
{
  "type": "example",
  "title": "Trace a maximum scan",
  "input": "`[-5, -2, -7]`",
  "steps": [
    "Initialize best to -5.",
    "Update best to -2 after the next comparison.",
    "Keep -2 when comparing it with -7."
  ],
  "code": {
    "language": "csharp",
    "content": "int best = nums[0];\nforeach (int value in nums)\n{\n    best = Math.Max(best, value);\n}"
  },
  "output": "`-2`",
  "explanation": "After each iteration, best is the largest element in the visited prefix."
}
```

### Active Recall With Hidden Answer

`prompt` and `answer` are required. `hint` and `title` are optional. The hint and answer are separately expandable, so the answer is not revealed while reading the question. Markdown in the answer can include lists, tables and fenced code.

```json
{
  "type": "recall",
  "title": "Reason about an edge case",
  "prompt": "Maximum scan: why does initializing best to zero fail for an all-negative input?",
  "hint": "Try tracing `[-5, -2, -7]`.",
  "answer": "Zero is not in the input and is larger than every input value. Initialize best to the first element instead."
}
```

Recall blocks do not create flashcards, modify review schedules or receive study credit. Continue using `quizQuestions` and `flashcards` for tracked practice. Their format and ownership rules are unchanged.

### Expandable Explanation

Use the same content fields as a callout. This is useful for a long derivation, additional context, a solution or a code explanation that should not interrupt the main article.

```json
{
  "type": "details",
  "title": "Why the invariant proves correctness",
  "paragraphs": [
    "The initial value covers the first element.",
    "Each comparison extends the visited prefix by one element while preserving its maximum."
  ]
}
```

Expandable explanations, hints and answers are automatically expanded in printable PDF exports.

### Definitions, Checklist and Takeaways Blocks

```json
[
  { "type": "definitions", "items": [{ "term": "Term", "definition": "Meaning and example." }] },
  { "type": "checklist", "items": ["Explain the mechanism.", { "text": "State one limitation.", "checked": false }] },
  { "type": "takeaways", "title": "Remember for the interview", "items": ["Mechanism", "Tradeoff", "Edge case"] }
]
```

Place those objects inside a section's `blocks` array. Optional learning blocks are validated before the import request is sent. Errors identify the relevant field; malformed new blocks are not silently discarded.

## Editing the Result

Generated articles are ordinary editable Markdown. The editor's Note, Definition and Recall helpers insert at the current cursor using the existing insertion behavior. Containers use a colon fence:

```text
:::tip Important detail

Keep the original explanation here.

:::

:::details Reveal answer

The answer can include **bold text**, lists, tables and code.

:::
```

Use a longer colon fence for a container that contains another container. Batch import handles this automatically. Raw HTML and unsafe link protocols are not rendered. Standard Markdown nested lists, emphasis, tables, code, local image references and read-only task lists are supported.

## Optional Addition to Your Existing AI Prompt

Keep your existing page, quiz, flashcard and source requirements. Append these rules only when you want the new optional formatting:

> Sections may additionally contain `definitions` (term/definition objects), `checklist` (strings or text/checked objects), `takeaways` (strings) and an ordered `blocks` array. Lists and steps may contain strings or nested text/items objects. Inside blocks, optionally use `callout`, `example`, `recall`, `details`, `definitions`, `checklist` and `takeaways` as documented above. Use these only where they improve clarity or recall. Keep quizQuestions, flashcards, sources, children and the top-level pages object exactly as before. Preserve the full source explanations, expanded abbreviations, code, edge cases and tradeoffs. Do not replace source text with a short callout or summary. Do not add unsupported quiz or flashcard fields. Every quiz and flashcard must still be understandable when mixed with other topics. Recall blocks complement scored practice; they do not replace it.

The application's **Batch import > JSON structure** displays a valid, importable example of the extended format.

## Updating Existing Articles With JSON

Open an article and select **Edit JSON**. This is an update workflow, separate from batch import, which creates new articles.

1. Optionally enable **Include subpages** to export the selected article's branch (up to 500 pages).
2. Use the copy icon or download the JSON file. The document retains the `pages` / `children` hierarchy.
3. Edit the JSON directly or ask AI to revise it, then paste the result into the JSON editor.
4. Select **Review changes**, inspect the article preview and removal warnings, then **Save changes**.

The exported `contentMarkdown` is the canonical article body. Local images remain in their original Markdown positions, using `![Alt text](wiki-image:IMAGE_ID)`. Each article also contains an informational `images` manifest with image IDs, filenames, SHA-256 digests, occurrence counts and original line numbers. Line numbers describe the export; placement after editing is determined by the image markers in `contentMarkdown`, not by the manifest.

Keep `id`, `updatedAt`, `parentId` and the original hierarchy unchanged. Metadata such as `path`, `createdAt`, `images`, review preferences and existing check IDs is not edited through this workflow. To move pages use article details; to create new pages use batch import. Quiz and flashcard content may be edited, but unchanged checks retain their identifiers and practice history. Changed checks are treated as changed learning material; previous answers are not reassigned to different questions.

Omitted article fields retain their previous values. Omitted subpages, including an empty `children` array, **do not delete existing pages**. Explicit empty arrays clear sources, quizzes or flashcards and show a warning. Removing local image markers requires explicit permission and confirmation; even then the stored image files are not deleted. References to unknown local images are rejected.

All selected updates commit together in one database transaction. If any article changed after export, saving returns a conflict and writes nothing; the JSON editor retains your text. This feature adds no database migration and uses the existing SQLite image storage and backup formats. JSON editing files contain references, **not image binary data**: use the existing database backup/export to move content and images to another installation.

### Adding Article Vocabulary Without Rewriting Its Body

`definitions` provides a topic-local glossary, not a separate global dictionary. To add vocabulary to an exported article while retaining its complete Markdown body, add `appendSections` alongside `contentMarkdown`:

```json
{
  "appendSections": [
    {
      "heading": "Vocabulary",
      "definitions": [
        { "term": "Invariant", "definition": "A property that remains true throughout an algorithm." },
        { "term": "Load factor", "definition": "The number of stored entries divided by the number of buckets." }
      ]
    }
  ]
}
```

This is a fragment to add to an exported page, not a standalone import document. The added sections are compiled into ordinary editable Markdown when saved. Each submission appends them once; a fresh export includes the resulting Markdown, not a persistent `appendSections` field.

Alternatively, remove `contentMarkdown` and replace it with structured `lead`, `sections` and other supported batch fields. Do not supply both a nonempty `contentMarkdown` and a replacement structured body. To retain an existing image inside an ordered `blocks` array, use:

```json
{
  "type": "image",
  "imageId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "alt": "Load balancer diagram",
  "caption": "Requests distributed across three application instances."
}
```

Replace the example ID with an image ID from the exported manifest. The block does not upload an image; it references an existing locally stored one. The same optional block is accepted by batch import.

### Suggested AI Revision Instructions

> Revise this existing Repetitio Wiki JSON, not a new batch import. Return valid JSON with its original pages/children hierarchy. Preserve every id, updatedAt and parentId exactly. Preserve local wiki-image references and their positions relative to the surrounding explanation unless I explicitly request a move or removal. Treat contentMarkdown as the complete article body; do not replace it with a shorter summary. Keep sources, quizzes and flashcards unless specifically asked to modify them. Use appendSections for additional vocabulary or explanations, or replace contentMarkdown with structured sections, never both replacement formats together. Do not invent image IDs or new page IDs. Do not modify metadata or review preferences. Omit unrelated subpages rather than deleting their content.
