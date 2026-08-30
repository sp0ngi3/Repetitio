# Repetitio System Design

Purpose: Personal learning and repetition platform  
Primary user: Single user  
Deployment model: Localhost with Docker Compose

## 1. Overview

Repetitio is a local-first learning platform for practicing and revisiting core software engineering fundamentals. Its main purpose is to build a durable personal practice history.

The application focuses on three domains:

- Basics
- Data Structures & Algorithms
- System Design

Repetitio should help the user understand what they practiced, what they have avoided, what is due for review, and how their confidence changes over time.

The initial version is intentionally designed as a single-user localhost system. No cloud infrastructure is required for the MVP.

## 2. Product Principles

The product should optimize for:

- One developer
- One machine
- One local database
- Fast startup
- Simple backups
- Durable practice history
- Low operational overhead

The product should avoid early complexity such as authentication, microservices, distributed databases, message brokers, real-time collaboration, and cloud synchronization.

## 3. Core Domains

### 3.1 Basics

Basics are small implementation exercises that should be repeated regularly. They preserve muscle memory for fundamentals that are rarely implemented from scratch during normal development.

Example exercises:

- Kadane's Algorithm
- Insertion Sort
- Quick Sort
- Merge Sort
- Binary Search
- Reverse Linked List
- Binary Search Tree Traversal

Example exercise:

```text
Title: Quick Sort
Language: C#

Requirements:
- Sort the array in place.
- Average time complexity should be O(n log n).
- Do not use Array.Sort().

Function signature:
public static void QuickSort(int[] values)
```

When a Basics submission is submitted, Repetitio should:

- Compile the code
- Execute automated tests
- Detect compilation errors
- Detect runtime errors
- Detect timeouts
- Verify correctness
- Run benchmarks if correctness tests pass
- Save the attempt
- Update practice history
- Update review scheduling

Example result:

```text
Quick Sort

Status: Passed

Tests:
18 / 18 passed

Execution:
Median: 1.82 ms
P95: 2.11 ms

Practice history:
Today: 1 attempt
This week: 3 successful attempts
All time: 14 attempts

Last practiced:
2026-08-30
```

### 3.2 Data Structures & Algorithms

The DSA section acts as a personal problem database and learning journal.

Problems may originate from:

- LeetCode
- HackerRank
- Codeforces
- Books
- Interviews
- Personal exercises
- Custom problems

Each problem should track how many times it has been attempted and solved. A simple mastery rule can be introduced, for example marking a problem as mastered after six successful solves.



Recommended DSA practice template:

```markdown
# Problem

## Test Cases

## Assumptions

## Approach

## Code

## Complexity

## What should I know after solving this problem?

## What questions should I have asked myself?

## What mental steps did I miss?
```

### 3.3 System Design

The System Design section is used to practice architecture problems.

Example problems:

- Design Twitter
- Design YouTube
- Design Dropbox
- Design Uber
- Design a URL Shortener
- Design a Notification System
- Design a Rate Limiter
- Design a Distributed Cache
- Design a Message Queue
- Design a Search Autocomplete System



Automatic evaluation of system design answers is out of scope for the MVP. The goal is:

```text
Practice -> Reflect -> Save -> Review -> Repeat
```

## 4. Practice Model

Everything in Repetitio revolves around practice sessions. A learning item represents something that can be practiced. Every time the user works on that item, a new practice session is recorded.

```text
Learning Item
  |
  +-- Practice Session
  +-- Practice Session
  +-- Practice Session
```

A practice session records:

- StartedAt
- CompletedAt
- Duration
- Outcome
- Confidence
- Notes
- WhatHelped
- WhatWasDifficult
- ImproveNext

Example history:

```text
Quick Sort

2026-08-30    Passed     8m 32s
2026-08-27    Passed    11m 14s
2026-08-23    Failed    17m 03s
2026-08-18    Passed    14m 48s
```

This history is one of the most important parts of the product.

## 5. Repetition System

The first review system should stay intentionally simple.

After finishing a practice session, the user assigns confidence:

| Confidence | Meaning | Next Review |
| --- | --- | --- |
| 1 | I do not understand this | 1 day |
| 2 | I understand parts of it | 3 days |
| 3 | I can probably solve it again | 7 days |
| 4 | I understand it well | 14 days |
| 5 | I can solve it confidently from memory | 30 days |

The selected confidence produces a `NextReviewAt` date.

The dashboard can then show items due today:

```text
Due Today

Quick Sort
Binary Search
Sliding Window
Design a Rate Limiter
```

Future versions may replace this logic with a real spaced repetition algorithm such as SM-2, FSRS, or a custom adaptive algorithm.

## 6. Dashboard

The home dashboard should provide a quick overview of current practice state.

Dashboard sections:

- Due for Review
- Recent Activity
- Weekly Activity
- Statistics
- Least-practiced basics
- Weakest tags
- Overdue items

Example recent activity:

```text
Quick Sort               Passed      8 minutes ago
Two Sum                  Solved      Yesterday
Design Twitter           Completed   2 days ago
Insertion Sort           Passed      3 days ago
```

Example weekly activity:

```text
Mon  ###
Tue  #####
Wed  ##
Thu  ####
Fri  #
Sat  ######
Sun  ###
```

The exact visualization can be implemented later.

## 7. Architecture

The initial system should use a modular monolith architecture.

```text
+------------------------------+
|          React UI            |
|                              |
| Dashboard                    |
| Basics                       |
| DSA                          |
| System Design                |
| Review Queue                 |
+--------------+---------------+
               |
               | HTTP / JSON
               v
+------------------------------+
|       ASP.NET Core API       |
|                              |
| Practice Module              |
| Basics Module                |
| DSA Module                   |
| System Design Module         |
| Review Module                |
| Backup Module                |
+-------+--------------+-------+
        |              |
        |              |
        v              v
+--------------+  +-----------------+
|    SQLite    |  |   Code Runner   |
|              |  |                 |
| repetitio.db |  | Compile C#      |
|              |  | Run tests       |
|              |  | Benchmark       |
+--------------+  +-----------------+
```

This structure keeps domain logic separated without introducing unnecessary distributed-system complexity.

## 8. Technology Stack

Frontend:

- React
- TypeScript
- Vite
- Tailwind CSS or shadcn/ui

Backend:

- C#
- ASP.NET Core
- Entity Framework Core

Persistence:

- SQLite
- Entity Framework Core Code First migrations
- Host-mounted database file

Runtime:

- Docker Compose
- API container
- Web container
- Isolated code runner container



## 9. Code Execution Architecture

User-provided code should not execute inside the ASP.NET API process.

Even though Repetitio is a personal localhost application, separated execution prevents code such as infinite loops or process exits from breaking the main application.

Recommended flow:

```text
ASP.NET API
     |
     | ExecuteSubmission
     v
Code Runner
     |
     +-- Create temporary project
     +-- Inject user implementation
     +-- Inject test harness
     +-- Compile
     +-- Execute
     +-- Measure
     +-- Return result
```

The runner should execute inside its own Docker container.

## 10 Runner Isolation

The Code Runner container should have:

- No external network access
- CPU limit
- Memory limit
- Execution timeout
- Non-root user
- No application secrets
- Temporary filesystem

Conceptual runtime:

```text
repetitio-api
      |
      | internal Docker network
      v
repetitio-runner
```

The runner should only accept execution requests from the backend.

Example request:

```json
{
  "exerciseId": "quick-sort",
  "language": "csharp",
  "sourceCode": "...",
  "executionId": "..."
}
```

Example response:

```json
{
  "status": "Passed",
  "testsPassed": 18,
  "testsFailed": 0,
  "compilationDurationMs": 413,
  "benchmark": {
    "medianMs": 1.82,
    "p95Ms": 2.11
  }
}
```



## 10. Persistence

Data persistence is critical. Running the following commands must not destroy user data:

```bash
docker compose down
docker compose up
```

The project should use a host bind mount:

```text
data/
  repetitio.db
```

Docker concept:

```yaml
volumes:
  - ./data:/data
```

The database exists physically on the host machine at:

```text
./data/repetitio.db
```

Destroying and recreating containers must not destroy the database.

The following directories should normally not be committed:

- data/
- backups/

## 12. Backup and Restore

The UI should provide explicit backup functionality from Settings:

- Export Data
- Validate Backup
- Import Data

Export creates a file such as:

```text
repetitio-backup-2026-08-30.zip
```

Possible backup structure:

```text
repetitio-backup-2026-08-30.zip
+-- manifest.json
+-- repetitio.db
+-- attachments/
```

Example manifest:

```json
{
  "application": "Repetitio",
  "schemaVersion": 1,
  "createdAt": "2026-08-30T14:30:00Z",
  "databaseSchemaVersion": "20260830193638_AddSystemDesignTracker"
}
```

The export process should use the SQLite backup mechanism rather than blindly copying an active database file.

Implemented API endpoints:

- `GET /api/backup/status`
- `GET /api/backup/export`
- `POST /api/backup/validate`
- `POST /api/backup/import`

Import should:

1. Read `manifest.json`.
2. Validate the backup.
3. Verify the schema version.
4. Create a backup of the current database.
5. Replace or restore the imported database.
6. Restart or reload the database connection.

A corrupted or incompatible backup must never overwrite the current database without validation.

The Docker Compose setup bind-mounts both persistent runtime directories:

```yaml
volumes:
  - ./data:/data
  - ./backups:/backups
```

## 13. Docker Compose

Initial services:

- repetitio-web
- repetitio-api
- repetitio-runner

Conceptual layout:

```text
+-----------------------------+
|        localhost:3000       |
|                             |
|        repetitio-web        |
|             |               |
|             v               |
|        repetitio-api        |
|             |               |
|        +----+----+          |
|        v         v          |
|     SQLite    code-runner   |
+-----------------------------+
```


## 14. Key Engineering Decisions

### Decision 1: Use a modular monolith

Reason: The application does not require distributed services. Clear modules inside one backend are enough for the MVP.

### Decision 2: Use SQLite

Reason: The application is local, single-user, and should be trivial to back up.

### Decision 3: Store every practice attempt

Reason: Historical progress is more important than only storing the latest solution.

### Decision 4: Separate code execution from the main API

Reason: Broken or infinite-running user code should not crash Repetitio itself.

### Decision 5: Use Docker Compose

Reason: The application should start with a single command:

```bash
docker compose up
```

### Decision 6: Persist the database on the host filesystem

Reason: Destroying containers should never destroy learning history.

### Decision 7: Keep repetition logic simple initially

Reason: The important part is building the practice habit and collecting historical data. A sophisticated spaced-repetition algorithm can be introduced later.
