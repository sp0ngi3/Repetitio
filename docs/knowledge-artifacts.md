# Knowledge Artifacts Roadmap

This document describes the planned expansion of Repetitio into a local-first personal knowledge base for interview preparation.

The goal is to build this incrementally. We will try to make Repetitio capable of storing, linking, importing, and exporting not only practice history, but also the learning materials that explain why an answer works.

## 1. Product Direction

Repetitio already tracks practice across Basics, DSA, System Design, and Flashcards. The next major direction is to add reusable learning artifacts:

- Personal wiki pages for long-form notes and definitions.
- Editable drawings for diagrams, flows, and architecture sketches.
- Local images for screenshots, references, whiteboard captures, and visual memory aids.
- Links between artifacts and existing learning areas.

This should help answer questions such as:

- What explanation did I write for this problem?
- Which diagram did I use for this System Design attempt?
- Which wiki page explains this tag or concept?
- Which flashcards came from this material?
- Can I export everything and restore it later on another machine?

## 2. Core Decision

The recommended design is one shared artifact system, not three isolated features.

Conceptually:

```text
-------------------+
| Knowledge Pages   |
+-------------------+
| Drawing Documents |
+-------------------+
| Media Assets      |
+-------------------+
          |
          v
+-------------------+
| Artifact Links    |
+-------------------+
          |
          v
+------------------------------------------------+
| DSA | System Design | Basics | Flashcards | Wiki |
+------------------------------------------------+
```

This allows one artifact to be reused in many places. For example, a Redis wiki page could be linked to a Rate Limiter system design problem, a distributed cache problem, and several flashcards.

## 3. Repositorium / Wiki

The Repositorium should be a private markdown-style wiki stored locally.

Expected capabilities:

- Create, edit, delete, and search pages.
- Write markdown content.
- Create headings, definitions, checklists, tables, and code blocks.
- Use tags for discovery.
- Link pages using a wiki-style syntax such as `[[Redis]]` or `[[Consistent Hashing]]`.
- Show backlinks so the user can see where a concept is referenced.
- Attach pages to DSA problems, System Design problems, Basics exercises, Flashcards, and saved learning sessions.

Possible model:

```text
KnowledgePage
- Id
- Title
- Slug
- ContentMarkdown
- Summary
- ParentPageId
- CreatedAt
- UpdatedAt
```

## 4. Functional Drawing

Functional drawings should be editable diagrams, similar in purpose to Excalidraw or draw.io.

For System Design, this is especially important because architecture practice often depends on diagrams. Drawings should also be useful for DSA, Basics, and flashcards.

Expected capabilities:

- Create and edit diagrams.
- Store the diagram as structured JSON, not only as an image.
- Optionally generate a local preview image for fast display.
- Attach diagrams to learning items and wiki pages.
- Reopen diagrams later and keep editing them.

Possible model:

```text
DrawingDocument
- Id
- Title
- Description
- CanvasJson
- PreviewImageAssetId
- CreatedAt
- UpdatedAt
```

Important decision: the editable diagram source should live in the database as JSON. A PNG or SVG preview can be generated for display, but it should not be the only source of truth.

## 5. Local Image Storage

Images should be stored locally, not in the cloud.

Implemented Wiki-first approach:

- Store wiki image metadata and binary bytes in SQLite.
- Use SHA-256 hashes to deduplicate repeated screenshots.
- Reference images from markdown with portable `wiki-image:{id}` links.
- Include images automatically in export/import backups because the backup already contains `repetitio.db`.
- Validate basic image signatures before storing PNG, JPEG, WEBP, or GIF files.

Possible model:

```text
WikiImage
- Id
- FileName
- ContentType
- SizeBytes
- Sha256
- Data
- CreatedAt
```

Reason: the app is local and personal, and most current images are expected to be screenshots. Keeping Wiki images in SQLite makes them harder to orphan, keeps import/export simple, and means deduplication happens by content hash instead of file path. If image volume becomes very large later, a future migration can move binary storage behind a shared `MediaAsset` abstraction while preserving the same markdown references.

## 6. Artifact Links

Artifact links are the glue between the new materials and the existing learning system.

Possible model:

```text
ArtifactLink
- Id
- ArtifactId
- ArtifactType
- TargetId
- TargetType
- Label
- SortOrder
- CreatedAt
```

Possible artifact types:

- KnowledgePage
- DrawingDocument
- MediaAsset

Possible target types:

- DsaProblem
- SystemDesignProblem
- BasicExercise
- Flashcard
- FlashcardLearningSession
- KnowledgePage

Each existing learning module should eventually show a shared `Linked Materials` panel:

- Attached wiki pages
- Attached drawings
- Attached images
- Create new material
- Attach existing material
- Open material
- Remove link

## 7. Import And Export

Every artifact feature must be portable through the existing backup flow.

Current backups include:

```text
backup.zip
- manifest.json
- repetitio.db
```

Current artifact-aware backups include:

```text
backup.zip
- manifest.json
- repetitio.db
```

Export requirements:

- Include all database records.
- Include all wiki image blobs stored in `WikiImages`.
- Include generated drawing previews if they exist.
- Validate required artifact tables before import.
- Add file hashes and expected paths to the manifest if future media moves outside SQLite.

Import requirements:

- Validate `manifest.json`.
- Validate SQLite integrity.
- Validate schema compatibility.
- Create a pre-import backup.
- Restore database records.
- Restore wiki image blobs with the database.
- Validate included media file hashes and re-map paths if future media moves outside SQLite.
- Handle obsolete or missing artifact links safely.

If a link points to a target that no longer exists, import should not fail the whole backup by default. The safer behavior is to preserve the artifact and either skip the broken link or mark it as orphaned for later cleanup.

## 8. Suggested Build Order

The safest implementation order is:

1. Add Wiki image storage and backup validation.
2. Add `KnowledgePage` wiki CRUD and search.
3. Add `ArtifactLink` and a shared linked-materials panel.
4. Attach wiki pages and images to DSA, System Design, Basics, Flashcards, and saved learning sessions.
5. Add drawing documents with editable JSON storage.
6. Add drawing previews and include them in export/import.
7. Add backlinks, wiki links, and global search across practice and artifacts.

This order keeps the foundation portable before adding richer UI features.

## 9. Risks And Decisions

### Store drawing JSON in SQLite

Decision: store the editable diagram source as JSON in the database.

Reason: the user must be able to reopen and edit diagrams later. Images alone are not enough.

### Store wiki images in SQLite

Decision: store Wiki image metadata and binary bytes in SQLite.

Reason: this keeps screenshots local, deduplicated, and automatically included in the existing export/import archive. It also avoids broken local file paths while the artifact system is still growing.

### Use one shared linking model

Decision: use `ArtifactLink` rather than adding separate attachment tables for every module.

Reason: Repetitio needs cross-linking. One wiki page or diagram should be reusable across multiple problems, sessions, and concepts.

### Keep everything local-first

Decision: no cloud storage is required for this feature.

Reason: the app is personal, local, and designed to be portable through backups.

## 10. Success Criteria

This expansion is successful when:

- A user can create a wiki page and attach it to a DSA or System Design problem.
- A user can create a diagram and reopen it later for editing.
- A user can add a local image to a wiki page by selecting a file or pasting a screenshot.
- A user can export the whole app, including database records and wiki images.
- A user can import the backup and recover the same notes, images, diagrams, and links.
- Broken links do not silently send the user to empty screens.
