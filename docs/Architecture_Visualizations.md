# Architecture Visualizations Guide
## Project 11 — Alumni Mentorship and Career Network

This document provides a visual-first walkthrough of the core architectural patterns, components, flows, and security boundaries of the P11 Platform (Track J — Next.js Full-Stack Modular Monolith).

All diagrams are rendered in interactive **Mermaid.js** format.

---

## 1. System Context Architecture
Shows the platform boundary, primary human actors, and all external institutional integrations.

```mermaid
flowchart TB
    subgraph Users ["Platform Actors"]
        Student["Student"]
        Mentor["Alumni Mentor"]
        ARO["Alumni Relations Officer (ARO)"]
        PO["Placement Officer"]
        Admin["Administrator"]
    end

    SSO["University SSO (OAuth2 / OIDC)"]

    subgraph CorePlatform ["P11 Platform Boundary"]
        Platform["Alumni Mentoring & Career Network\n(Track J — Next.js Modular Monolith)"]
    end

    subgraph ExternalSystems ["External Systems & Services"]
        AlumniRecords["Institutional Alumni Records (ERP / SIS)"]
        Calendars["Calendar Services (Google Calendar / MS Outlook)"]
        VideoConf["Video Conferencing (Google Meet / Zoom / MS Teams)"]
        Notifications["Notification Providers (Email / SMS)"]
        DocStorage["Verification Document Object Storage"]
        PlacementRecords["Institutional Placement Records"]
        LinkedIn["LinkedIn (Optional Profile Prefill)"]
    end

    SSO -->|"Authenticates identity & roles"| Platform
    Student -->|"Discovers mentors, requests sessions, tracks goals"| Platform
    Mentor -->|"Configures capacity, accepts requests, mentors"| Platform
    ARO -->|"Reviews verifications, oversees relationships"| Platform
    PO -->|"Monitors placement & mentoring analytics"| Platform
    Admin -->|"Manages programme configuration & system audit"| Platform

    Platform -->|"Validates degrees & graduation records"| AlumniRecords
    Platform -->|"Syncs availability & session events"| Calendars
    Platform -->|"Generates secure meeting links"| VideoConf
    Platform -->|"Dispatches transactional notifications"| Notifications
    Platform -->|"Stores & signs verification documents"| DocStorage
    Platform -->|"Aggregates career placement outcomes"| PlacementRecords
    Platform -.->|"Optional profile prefill"| LinkedIn
```

---

## 2. Container-Level Runtime Architecture
Displays the Next.js App Router boundary, Application Core, MongoDB primary store, Redis caching/throttling, BullMQ async processing, and optional Socket.IO realtime server.

```mermaid
flowchart TB
    Client["User Browsers & Mobile Clients"] -->|"HTTPS / WSS"| Edge["Edge / CDN / Reverse Proxy"]

    subgraph NextRuntime ["Next.js Full-Stack Application Runtime (Node.js)"]
        AppRouter["App Router (UI / Server & Client Components)"]
        RouteHandlers["Route Handlers (REST Endpoints)"]
        ServerActions["Server Actions (Mutations & Forms)"]

        subgraph CoreMonolith ["Application Core (Modular Monolith)"]
            DomainServices["Domain Services (M1 - M10)"]
            AuthBoundary["Authentication & RBAC Context Resolver"]
            PrivacyBoundary["Centralized Privacy Filter"]
            OutboxMgr["Durable Outbox Dispatcher"]
            Adapters["Integration Adapters"]
        end

        AppRouter --> CoreMonolith
        RouteHandlers --> CoreMonolith
        ServerActions --> CoreMonolith
    end

    Edge --> AppRouter
    Edge --> RouteHandlers
    Edge --> ServerActions

    subgraph DataTier ["Persistence & Caching Tier"]
        MongoDB[("MongoDB 7+ Replica Set\n(Primary Authoritative DB)")]
        Redis[("Redis 7+\n(Cache / Rate Limits / Transient State)")]
    end

    subgraph AsyncTier ["Background Processing Tier"]
        BullMQ["BullMQ Job Queues\n(Redis-backed)"]
        WorkerRuntime["Worker Runtime\n(Scheduled & Event-Driven Jobs)"]
    end

    subgraph RealtimeTier ["Realtime Tier (Optional M9)"]
        SocketServer["Socket.IO Realtime Gateway"]
    end

    subgraph ExternalBoundary ["External Systems"]
        ExtSSO["University SSO"]
        ExtAlumni["Alumni ERP / SIS"]
        ExtCalendar["Google / Outlook Calendars"]
        ExtVideo["Video Conferencing APIs"]
        ExtNotify["Email / SMS Providers"]
        ExtStorage["S3-Compatible Object Storage"]
    end

    CoreMonolith -->|"Mongoose Models (Module-Scoped)"| MongoDB
    CoreMonolith -->|"Rate Limiting / Cached Reads"| Redis
    CoreMonolith -->|"Writes Outbox Events"| MongoDB
    OutboxMgr -->|"Publishes Queued Jobs"| BullMQ
    BullMQ --> WorkerRuntime
    WorkerRuntime -->|"Updates Domain State"| MongoDB
    WorkerRuntime -->|"Dispatches Alerts"| ExtNotify

    Edge -.->|"WebSocket"| SocketServer
    SocketServer -.->|"Cluster Coordination"| Redis
    SocketServer -.->|"Persists Chat Messages"| MongoDB

    Adapters --> ExtSSO
    Adapters --> ExtAlumni
    Adapters --> ExtCalendar
    Adapters --> ExtVideo
    Adapters --> ExtNotify
    Adapters --> ExtStorage
```

---

## 3. Module Dependency & Boundary Architecture
Illustrates the 10 distinct domain modules (M1–M10) and enforces that all communication occurs strictly through public domain service interfaces rather than cross-module direct database querying.

```mermaid
flowchart TD
    subgraph OnboardingProfiles ["Identity & Profiles"]
        M1["M1: Alumni Verification & Profile"]
        M2["M2: Capacity & Availability"]
        M3["M3: Student Career Profile"]
    end

    subgraph MatchingConnection ["Discovery & Connection"]
        M4["M4: Matching & Recommendation"]
        M5["M5: Requests & Mentorship Lifecycle"]
    end

    subgraph ActiveMentoring ["Active Relationship Lifecycle"]
        M6["M6: Scheduling & Sessions"]
        M7["M7: Goals & Feedback"]
        M8["M8: Engagement & Health Nudges"]
        M9["M9: Messaging (Optional)"]
    end

    subgraph GovernanceAnalytics ["Programme Governance"]
        M10["M10: Programme Analytics & Reporting"]
    end

    M1 -->|"Verified status & profile"| M2
    M1 -->|"Mentor credentials"| M4
    M2 -->|"Capacity check & consumption"| M4
    M3 -->|"Student goals & preferences"| M4

    M4 -->|"Recommended mentors"| M5
    M2 -->|"Atomic capacity deduction"| M5

    M5 -->|"Active mentorship context"| M6
    M5 -->|"Authorized channel context"| M9

    M6 -->|"Completed session records"| M7
    M6 -->|"Session activity timestamps"| M8
    M7 -->|"Goal milestones & sentiment"| M8

    M7 -->|"Outcome & satisfaction data"| M10
    M8 -->|"Health & dropout-risk scores"| M10
```

---

## 4. Mentor Capacity & Concurrency Architecture (INV-02)
Visualizes how the critical invariant `Active mentees <= Mentor capacity` is strictly preserved under high-concurrency race conditions using MongoDB atomic conditional updates (`$inc` with `$lt` condition).

```mermaid
flowchart TD
    subgraph NonAtomic ["Anti-Pattern: Vulnerable Non-Atomic Read-Then-Write (Prohibited)"]
        R1["1. Read Current Active Mentees Count"] --> R2["2. Check count < maxCapacity in app logic"]
        R2 --> R3["3. Insert new Mentorship record"]
        Rnote["Vulnerability: 2 concurrent accepts both read count=2 (limit=2), both pass check, capacity exceeded!"]
    end

    subgraph AtomicPattern ["P11 Enforced Atomic Capacity Pattern (Track J)"]
        A1["Mentor initiates 'Accept Request'"] --> A2["Verify MentorshipRequest.status == PENDING"]
        A2 --> A3["MongoDB Atomic Conditional Update:\nfindOneAndUpdate(\n  {\n    mentorId: id,\n    activeMentees: { $lt: maxCapacity }\n  },\n  { $inc: { activeMentees: 1 } }\n)"]
        A3 --> Outcome{"Document Matched & Modified?"}
        Outcome -- "YES: Capacity Reserved" --> S1["Set Request.status = ACCEPTED\nCreate Mentorship Record\nCommit Transaction"]
        Outcome -- "NO: Capacity Limit Reached" --> S2["Fail Request Acceptance Safely\nZero state corruption\nReturn HTTP 409 / Capacity Exceeded"]
    end
```

---

## 5. Privacy & Data Protection Architecture (INV-06 / PRV-01)
Demonstrates how alumni mentor contact information (email, phone) is shielded at the centralized output serialization layer, ensuring student-facing responses never leak private PII.

```mermaid
flowchart LR
    subgraph DataStore ["Authoritative MongoDB Storage"]
        Raw["Mentor Profile Entity\n- Full Name, Bio\n- Company, Job Title\n- RESTRICTED: Email Address\n- RESTRICTED: Phone Number"]
    end

    subgraph Domain ["Domain Layer"]
        Query["Mentor Query Service"]
    end

    subgraph PrivacyBoundary ["Centralized Privacy Serialization Filter (PRV-01)"]
        Gate{"Requester Role / Target"}
        PublicView["Student / Public View:\n- Name, Bio, Org, Title\n- email: OMITTED\n- phone: OMITTED"]
        AdminView["Authorized Staff / Self View:\n- Complete Profile with Contact Details"]
    end

    subgraph OutputSurfaces ["Consumer Surfaces"]
        StudentPortal["Student Portal / Search Results\n(Zero PII Leakage Surface)"]
        AdminPortal["Staff Administration Portal"]
    end

    Raw --> Query
    Query --> Gate
    Gate -- "Student / Anonymous" --> PublicView --> StudentPortal
    Gate -- "Staff / Owner" --> AdminView --> AdminPortal
```

---

## 6. Asynchronous Outbox & Background Processing Architecture
Shows how committed database mutations write durable outbox events within the same transaction to guarantee reliable delivery to BullMQ and asynchronous workers with zero event loss.

```mermaid
sequenceDiagram
    autonumber
    participant AppService as Application Service
    participant Mongo as MongoDB (State & Outbox)
    participant Dispatcher as Outbox Dispatcher
    participant Redis as Redis / BullMQ Queue
    participant Worker as Background Worker
    participant Ext as External Adapter / SMTP / SMS

    AppService->>Mongo: 1. Commit Domain State + Outbox Event (Atomic Transaction)
    Note over AppService,Mongo: Zero event loss guaranteed
    Dispatcher->>Mongo: 2. Poll Pending Outbox Records
    Dispatcher->>Redis: 3. Enqueue Job to BullMQ
    Dispatcher->>Mongo: 4. Mark Outbox Record Dispatched
    Redis->>Worker: 5. Dequeue Job for Execution
    Worker->>Worker: 6. Execute Idempotent Job Logic
    alt External Communication
        Worker->>Ext: 7a. Deliver Email / SMS / Webhook
    else Scheduled Batch / Expiry
        Worker->>Mongo: 7b. Expire Old Requests / Aggregate Metrics
    end
    Worker->>Redis: 8. Acknowledge Job Success
```

---

## 7. Production Deployment & Cloud Topology
Defines the multi-instance Next.js deployment, background worker cluster, Redis cluster, MongoDB Atlas replica set, and edge CDN layer.

```mermaid
flowchart TB
    Users["Platform Users\n(Students, Mentors, Staff, Admins)"] -->|"HTTPS / WSS"| Edge["Edge CDN / WAF / SSL Termination"]

    subgraph CloudVPC ["Production Cloud Environment"]
        LB["Load Balancer / Ingress Controller"]
        Edge --> LB

        subgraph WebFleet ["Next.js Application Runtime Fleet"]
            Web1["Next.js Node Instance 1"]
            Web2["Next.js Node Instance 2"]
            WebN["Next.js Node Instance N\n(Auto-Scaled)"]
        end

        LB --> WebFleet

        subgraph WorkerFleet ["Dedicated BullMQ Worker Fleet"]
            W1["Worker 1 (Expiry & Notifications)"]
            W2["Worker 2 (Reports & Analytics)"]
        end

        subgraph RealtimeGateway ["Optional Realtime Runtime (M9)"]
            RT["Socket.IO Node Cluster"]
        end
        LB -.->|"WebSocket"| RT

        subgraph ManagedData ["Managed Persistence Layer"]
            MongoCluster[("MongoDB Atlas Replica Set\n(Primary + Secondaries)")]
            RedisCluster[("Managed Redis Cluster\n(Queues, Limits, Pub/Sub)")]
        end

        WebFleet --> MongoCluster
        WebFleet --> RedisCluster
        RedisCluster --> WorkerFleet
        WorkerFleet --> MongoCluster
        RT <--> RedisCluster
        RT --> MongoCluster
    end

    subgraph ExtIntegrations ["Third-Party Integration Services"]
        ExtSSO["University SSO (OIDC)"]
        ExtSIS["University SIS"]
        ExtCal["Google / Outlook Calendars"]
        ExtEmail["SendGrid / Twilio"]
        ExtS3["Object Storage"]
    end

    WebFleet & WorkerFleet --> ExtSSO
    WebFleet & WorkerFleet --> ExtSIS
    WebFleet & WorkerFleet --> ExtCal
    WebFleet & WorkerFleet --> ExtEmail
    WebFleet & WorkerFleet --> ExtS3
```

---

## Summary of Architectural Baselines

| Key Area | Selected Approach | Key Correctness Guarantee |
|---|---|---|
| **Framework** | Next.js 15+ (App Router, Route Handlers, Server Actions) | Track J / Path J1 Full-Stack standard |
| **Monolith Architecture** | Modular Monolith (M1–M10) | Module-scoped Mongoose models, strictly interface-mediated cross-module calls |
| **Primary Database** | MongoDB 7+ Replica Set | Durable ACID transactions for cross-entity consistency |
| **Async Processing** | Redis 7+ and BullMQ | Transactional Outbox pattern guarantees zero event loss |
| **Capacity Concurrency** | Atomic conditional updates (`$inc` with `$lt`) | Strict preservation of `Active mentees <= Mentor capacity` (`INV-02`) |
| **Data Privacy** | Centralized server-side serialization filter | PII isolation (email/phone never leaked to students, `PRV-01`) |
| **Security & Auth** | University SSO (OIDC) + TOTP MFA + ABAC | Defense-in-depth security model |
| **Scale Target** | 2,000 sustained / 5,000 peak concurrent users | Low latency (read p95 < 400ms, write p95 < 800ms) with isolated workers |
