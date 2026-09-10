# Repetitio

Repetitio is a local-first personal learning and repetition platform for software engineering fundamentals. It is designed for one developer who wants to practice consistently, keep a record of previous attempts, and know what should be reviewed next.

The first version focuses on four learning areas:

- Basics: built-in implementation exercises covering two pointers, linked lists, recursion, sorting, and binary search.
- Data Structures & Algorithms: a personal problem database and learning journal for problems from LeetCode, HackerRank, Codeforces, books, interviews, and custom exercises.
- System Design: architecture practice sessions with requirements, estimates, trade-offs, bottlenecks, and reflection notes.
- Flashcards: question/explanation cards, saved learning sessions, flip-based review, and knew/did-not-know evaluation.

The core idea is simple: practice, reflect, save, review, repeat.

Basics exercises are built into the application. Users create Data Structures & Algorithms, System Design, and Flashcard learning items.

The current Basics catalog contains 13 executable C# exercises. It includes Reverse Linked List, sorted Two Sum, separate linked-list insertion and indexed lookup exercises, Floyd's linked-list cycle detection, factorial, Fibonacci, five separate sorting exercises (Insertion, Merge, Quick, Bucket, and Radix), and binary search in a sorted array.

Flashcards are stored in the same SQLite database as the rest of the system, so export, import, validation, and pre-import safety backups include cards, saved flashcard sessions, and review history.

The planned next expansion is a local-first knowledge/artifact system: a private Repositorium or wiki, editable functional drawings, and local image storage. The intent is to make Repetitio more than a practice tracker: it should become a personal interview preparation knowledge base where notes, diagrams, images, problems, basics exercises, flashcards, and saved learning sessions can all be connected.

The Wiki now supports local image embeds, downloadable print-to-PDF article exports for a page and its subtopics, and optional lightweight quiz/flashcard inserts that live with the article but do not affect review scheduling.

## Product Goals

Repetitio should help answer questions like:

- What have I already practiced?
- What have I never practiced?
- What should I repeat today?
- How many times did I practice a topic this week?
- What did I struggle with previously?
- What helped me solve a problem?
- How confident am I with this topic?
- When did I last implement this algorithm from memory?
- Which notes, diagrams, and images explain this topic best?
- Can I quiz myself inside a wiki article without changing my review queue?
- Which learning materials are connected to this problem or session?

The application is intentionally local, single-user, and lightweight. The MVP does not require authentication, cloud infrastructure, distributed systems, or multi-user features.

## Planned Knowledge Artifacts

Repetitio is expected to grow toward a shared artifact model instead of separate one-off features. The planned modules are:

- Repositorium / Wiki: personal markdown pages with headings, definitions, local images, PDF export, lightweight quiz inserts, flashcard inserts, tags, wiki-style links, and backlinks.
- Functional Drawing: editable diagrams similar in spirit to Excalidraw or draw.io, stored as structured JSON so they remain editable.
- Local Image Storage: wiki images are stored locally in SQLite with SHA-256 deduplication, so screenshots, sketches, and reference images stay portable.
- Artifact Links: a shared linking layer that can attach wiki pages, drawings, and images to DSA problems, System Design problems, Basics exercises, Flashcards, saved learning sessions, and other knowledge pages.

This is not meant to replace practice sessions. It should support them. A System Design attempt could link to a drawing, a DSA problem could link to an explanation page, a Basics exercise could link to a visual memory aid, and a flashcard deck could link to the source material it was created from.

All of these artifacts must remain local-first and portable. They should be included in export, import, validation, and backup flows. Wiki image blobs currently live inside SQLite so the existing backup archive contains images without a separate media folder.

See [docs/knowledge-artifacts.md](docs/knowledge-artifacts.md) for the proposed plan and decisions.

## Running Locally

Start the whole system:

```bash
docker compose up --build
```

This runs the API container and a production frontend build served by nginx.

Start only the API:

```bash
docker compose -f docker-compose.api.yml up --build
```

Start only the frontend:

```bash
docker compose -f docker-compose.frontend.yml up --build
```

This runs the frontend in Vite development mode and expects the API at `http://localhost:5182`.

The solution also includes `docker-compose.dcproj` so Visual Studio can discover the Docker Compose setup from `Repetitio.sln`.

On Windows, the root folder can contain a visible launcher executable:

```bash
./00-REPETITIO.exe
```

Double-clicking `00-REPETITIO.exe` opens a small console menu with Run, Start, Stop, Restart, and Status actions. `Run` starts Docker Compose, opens the frontend, waits for Enter, and then shuts the stack down.

The executable is generated from `tools/Repetitio.Launcher` and copied into the root folder for convenience.

Default local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`
- API health check: `http://localhost:8080/api/health`

When the API starts, it automatically applies pending Entity Framework Core migrations. The SQLite database is stored on the host under `data/repetitio.db` when Docker Compose is used, and pre-import safety backups are stored under `backups/`.

## Backup And Restore

Open Settings in the frontend to export or import data.

- Export Data creates a validated `repetitio-backup-YYYY-MM-DD-HHmmss.zip` archive.
- Validate Backup checks the manifest, SQLite integrity, required tables, and schema version without changing data.
- Import Data validates the uploaded backup, writes a pre-import backup to `backups/`, and restores the validated SQLite database.

The backup archive contains `manifest.json` and `repetitio.db`. Because wiki images are stored in the `WikiImages` table, exported backups already include them. Future drawing previews or external media folders may add manifest-level file checks, while import should continue handling obsolete or missing artifact links safely.

## Testing

Run backend unit tests:

```bash
dotnet test Repetitio.sln
```

Run frontend unit tests:

```bash
cd src/frontend/repetitio-web
npm test
```
