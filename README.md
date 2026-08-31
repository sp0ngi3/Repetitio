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

The application is intentionally local, single-user, and lightweight. The MVP does not require authentication, cloud infrastructure, distributed systems, or multi-user features.

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

The backup archive contains `manifest.json` and `repetitio.db`.

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
