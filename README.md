# Alumni Mentorship & Career Network (P11 Platform)

> Production-grade alumni networking, mentor-student matching, and career acceleration platform.
> **Next.js 16 • React 19 • MongoDB 7+ • Mongoose • Cloudinary Media • TypeScript**

---

## Architecture & Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend & SSR** | Next.js 16 (App Router) + React 19 | Server Components, Server Actions, modern layouts |
| **Database** | MongoDB 7+ via Mongoose ODM | Multi-tenant isolation, ACID transactions, Repository Pattern |
| **Media & Videos** | **Cloudinary** | Image transformations, face-crop avatars, adaptive HLS video streaming |
| **Media URLs** | **MongoDB Document Storage** | Pre-computed HTTPS Cloudinary URLs stored directly in MongoDB for zero-join queries |
| **Matching Engine** | Multi-Criteria Hybrid Engine | Semantic embeddings, taxonomy overlap, capacity constraints & Bayesian scoring |
| **Styling** | Tailwind CSS v4 | Clean, modern responsive design tokens |

---

## Media Architecture (Cloudinary + MongoDB)

All images (profile avatars, cover photos) and videos (90-second student Video CVs, pitch clips) are hosted on **Cloudinary**, while their authoritative metadata and URLs are stored in **MongoDB**:

- **Images**: Automatically optimized with face detection (`c_fill,w_512,h_512,g_face`), auto format (`f_auto` → WebP/AVIF), and quality compression (`q_auto`).
- **Videos**: Streamed via HLS (`.m3u8`) or MP4 with auto-generated poster frame thumbnails (`so_0`).
- **Zero-Join Discovery**: Profile documents (`Alumnus.avatarUrl`, `StudentProfile.avatarUrl`, `StudentProfile.videoCvUrl`, `StudentProfile.resumeUrl`) embed Cloudinary URLs directly for high-performance discovery cards without extra lookups.
- **Authoritative Media Ledger**: `UserMediaAsset` and `CareerAsset` collections maintain replacement history, variants, and audit trails.

For in-depth database layer documentation, see [src/lib/db/README.md](src/lib/db/README.md).

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/adarsh3699/Alumni-Mentorship-and-Career-Network.git
cd Alumni-Mentorship-and-Career-Network
npm install
```

### 2. Configure Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Configure your MongoDB URI and Cloudinary credentials:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/p11_alumni_mentorship

# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=p11-alumni
CLOUDINARY_CLOUD_NAME=p11-alumni
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

### 3. Seed Database (50 Verified Alumni & Media Assets)

Populates 50 alumni profiles, 10 student profiles, mentor capacities, goals, sessions, and Cloudinary media assets:

```bash
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build production application bundle |
| `npm run start` | Start production server |
| `npm run db:seed` | Idempotent database seeder with realistic Cloudinary media |
| `npm run match:test` | Run matching engine test suite against seeded data |
| `npm run lint` | Run ESLint static analysis |

---

## Project Structure

```
├── docs/                         # Specifications (PRD, SRS, Architecture, DB Design)
├── scripts/
│   └── test-match-engine.ts      # Recommendation engine test harness
├── src/
│   ├── app/                      # Next.js App Router (Pages, Layouts & Route Handlers)
│   └── lib/
│       ├── db/                   # Database Layer (Repositories, Models, Seed, Types)
│       │   ├── connection.ts     # MongoDB singleton connection
│       │   ├── models/           # 25 Mongoose Schemas & Indexes
│       │   ├── repositories/     # Domain data access repositories
│       │   │   ├── media/        # UserMediaAsset & CareerAsset (Cloudinary)
│       │   │   ├── m1/           # Alumni profiles & verification
│       │   │   └── ...           # M2–M10 repositories
│       │   ├── seed/             # Database fixtures & seeder
│       │   ├── types/            # TypeScript contracts & enums
│       │   ├── utils/            # Transactions, pagination & Cloudinary helpers
│       │   └── README.md         # Full Database Layer Documentation
│       └── match-engine/         # 4-stage multi-criteria recommendation engine
├── .env.example                  # Environment configuration template
└── README.md
```
