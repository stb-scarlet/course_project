# CV Management System — Backend

Node.js + Express + TypeScript + Prisma + MySQL

## Stack
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: MySQL 8+
- **Auth**: Passport.js (JWT + Google OAuth + Facebook OAuth)
- **Real-time**: Socket.io
- **Images**: Cloudinary
- **Validation**: Zod

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Set up MySQL database
```sql
CREATE DATABASE cv_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Push schema & generate Prisma client
```bash
npm run prisma:push
npm run prisma:generate
```

### 5. Seed initial data
```bash
npm run seed
```

### 6. Start development server
```bash
npm run dev
```

Server runs on `http://localhost:4000`

---

## API Overview

### Auth
| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| POST | /api/auth/register | Public | Register with email+password |
| POST | /api/auth/login | Public | Login, returns JWT |
| GET  | /api/auth/me | Auth | Get current user |
| PATCH| /api/auth/preferences | Auth | Update language/theme |
| GET  | /api/auth/google | Public | Start Google OAuth |
| GET  | /api/auth/facebook | Public | Start Facebook OAuth |

### Positions
| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| GET | /api/positions | Public | List positions (full-text search) |
| GET | /api/positions/:id | Public | Get position details |
| POST | /api/positions | Recruiter | Create position |
| POST | /api/positions/:id/duplicate | Recruiter | Duplicate position |
| PATCH | /api/positions/:id | Recruiter | Update (optimistic locking) |
| DELETE | /api/positions/:id | Recruiter | Delete position |
| GET | /api/positions/:id/cvs | Recruiter | List CVs for position |
| GET | /api/positions/:id/access-check | Candidate | Check if candidate has access |

### CVs
| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| GET | /api/cvs/my | Candidate | My CVs |
| GET | /api/cvs/search | Recruiter | Search all CVs |
| GET | /api/cvs/:cvId | Auth | Get CV + generated data |
| POST | /api/cvs | Candidate | Create CV for position |
| DELETE | /api/cvs/:cvId | Owner/Admin | Delete CV |
| POST | /api/cvs/:cvId/like | Recruiter | Like CV |
| DELETE | /api/cvs/:cvId/like | Recruiter | Remove like |

### Profile
| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| GET | /api/profile/:userId | Auth | Get profile |
| PATCH | /api/profile | Auth | Update (optimistic locking) |
| PUT | /api/profile/attributes/:attrId | Candidate | Upsert attribute value |
| DELETE | /api/profile/attributes/:attrId | Candidate | Remove attribute |
| POST | /api/profile/projects | Candidate | Add project |
| PATCH | /api/profile/projects/:id | Candidate | Update project |
| DELETE | /api/profile/projects/:id | Candidate | Delete project |

### Attribute Library
| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| GET | /api/attributes | Public | List (search + filter by category) |
| GET | /api/attributes/recent | Auth | Recently used by me |
| POST | /api/attributes | Recruiter | Create |
| PATCH | /api/attributes/:id | Recruiter | Update |
| DELETE | /api/attributes/:id | Recruiter | Delete |

### Discussion
| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| GET | /api/positions/:id/discussion | Public | List posts |
| POST | /api/positions/:id/discussion | Auth | Post message |

### Admin
| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| GET | /api/admin/users | Admin | List users |
| PATCH | /api/admin/users/:id/role | Admin | Assign role |
| PATCH | /api/admin/users/:id/block | Admin | Block user |
| PATCH | /api/admin/users/:id/unblock | Admin | Unblock user |
| DELETE | /api/admin/users/:id | Admin | Delete user |

### Stats (public)
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/stats | Global stats |
| GET | /api/stats/latest-positions | Recently updated positions |
| GET | /api/stats/popular-positions | Top 5 by CV count |
| GET | /api/stats/tag-cloud | Tag cloud data |

---

## Optimistic Locking

Every save operation sends a `version` field:
```json
{ "firstName": "John", "version": 3 }
```
If the server's version doesn't match → **409 Conflict**:
```json
{ "error": "Version conflict", "currentVersion": 4 }
```
The client should show a warning and let the user decide whether to refresh or force-save.

---

## WebSocket Events

Connect to `http://localhost:4000` with Socket.io client.

```js
socket.emit('joinPosition', positionId);   // join discussion room
socket.on('newPost', (post) => { ... });   // receive new posts in real-time
socket.emit('leavePosition', positionId);  // leave room
```

---

## Seed Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cvapp.com | Admin123! |
| Recruiter | recruiter@cvapp.com | Recruiter123! |
| Candidate | candidate@cvapp.com | Candidate123! |
