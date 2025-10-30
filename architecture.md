📝 Development Guide and Architecture Deep Dive

This document consolidates the architectural constraints, design rationale, and strategic roadmap for the Multi-Task Time Tracker (MTTT). It serves as the definitive guide for current and future developers, including AI agents.

1. Architectural Constraints

The MTTT is built upon a Minimal Serverless Architecture with a strict set of constraints.

1.1 The Single-File Mandate

Constraint: The entire application logic, UI, and styling must be contained within one file (index.html).

Rationale: Ensures absolute portability, zero build complexity, and ease of deployment in restricted environments.

Implications: Developers must use Vanilla JS or frameworks loaded via CDN (e.g., React/Angular/Vue single component files if refactored) and cannot rely on module bundlers or local assets.

1.2 Data Persistence and Security

Technology: Google Cloud Firestore is the sole persistence layer.

Security Path: All data must be written to the private, user-specific collection: /artifacts/{appId}/users/{userId}/entries.

Data Model (Time Entry):

Due to the Pause/Resume feature, the traditional startTime/endTime pair is no longer sufficient.

The definitive record is the total accumulated duration at the time the timer is stopped.

Field

Type

Description

project

String

Top-level category (crucial for grouping).

task

String

Nested activity detail.

totalDurationMs

Number

The accurate, accumulated time in milliseconds.

durationSeconds

Number

Human-readable, rounded duration at save time.

endTime

Timestamp

Time when the timer was definitively stopped and saved.

Data Fetch for Reports

Query

Reports view queries ALL historical documents for client-side aggregation.

2. Design and User Experience (UX) Rationale

2.1 Hierarchical Organization

Pattern: Active tasks are rendered using a Collapsible Accordion Pattern based on the Project name.

UX Goal: To manage complexity. By allowing users to collapse unrelated projects, the UI remains focused even when tracking many concurrent tasks. Tasks are sorted alphabetically by project name for predictable grouping.

2.2 Advanced Timer Controls

The system provides robust controls to handle real-world workflow interruptions.

Pause/Resume:

Mechanism: When paused, the startTime is nullified, and the elapsed time is stored in accumulatedMs. When resumed, startTime is set back to Date.now().

UX: Paused timers receive a visual indicator (orange border) and their buttons switch to Resume.

Delete (Discard): Allows users to remove accidental or incomplete timers from the active list without generating a permanent Firestore record.

2.3 Smart Input (<datalist>)

Mechanism: The <datalist> dynamically provides suggestions by combining hardcoded templates and the most recent unique Project / Task strings fetched from Firestore.

UX Goal: Reduce typing and ensure consistency in data entry, which is vital for accurate long-term reporting.

2.4 Reports View (P2 Completed)

Pattern: A separate tabbed interface is used to switch between the active Tracker and the Reports view.

Implementation: Uses Chart.js via CDN to dynamically generate two charts based on all historical Firestore data:

Project Time Distribution (Doughnut Chart): Shows percentage of time spent per project.

Daily Time Logged (Bar Chart): Shows total time logged for the last 7 days.

3. AI Agent Development Roadmap

Future development using AI agents should focus on refactoring for quality and adding core analysis features.

Priority

Task

Agent Focus & Requirements

P1

Refactor to React Component

Migrate all UI rendering and state logic to a single App.jsx functional component. Preserve all existing features (Pause/Delete, Collapsible UI, Firestore logic, and P2 Reports).

~~P2~~

~~In-App Visualization~~

COMPLETED.

P3

Data Filtering

Implement a simple UI component allowing users to filter the historical data exported (or viewed in P2) by Date Range and Project Name. This requires updating the renderReportsView function to handle UI filter inputs before charting.

P4

Query Optimization

Explore adding Firestore indices (if permitted by the environment) or optimizing the bulk data retrieval for faster visualization loading.

Agent Constraint Checklist:

Single-File: Yes

Preserve Firestore Schema: Yes

Utilize Global Auth: Yes

No Build Step: Yes
