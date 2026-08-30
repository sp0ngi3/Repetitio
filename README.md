# Repetitio

Repetitio is a local-first personal learning and repetition platform for software engineering fundamentals. It is designed for one developer who wants to practice consistently, keep a record of previous attempts, and know what should be reviewed next.

The first version focuses on three learning areas:

- Basics: short implementation exercises such as sorting algorithms, linked lists, tree traversals, and other fundamentals.
- Data Structures & Algorithms: a personal problem database and learning journal for problems from LeetCode, HackerRank, Codeforces, books, interviews, and custom exercises.
- System Design: architecture practice sessions with requirements, estimates, trade-offs, bottlenecks, and reflection notes.

The core idea is simple: practice, reflect, save, review, repeat.

Basics exercises are built into the application. Users create only Data Structures & Algorithms and System Design learning items.

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

Default local URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`
- API health check: `http://localhost:8080/api/health`

When the API starts, it automatically applies pending Entity Framework Core migrations. The SQLite database is stored on the host under `data/repetitio.db` when Docker Compose is used.

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
