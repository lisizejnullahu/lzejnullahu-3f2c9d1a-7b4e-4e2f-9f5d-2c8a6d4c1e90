# Secure Task Management System

Full-stack task management application with NestJS backend and Angular frontend in an Nx monorepo.

## Setup

### Prerequisites

- Node.js 18+
- npm

### Installation and Running

```bash
# Install dependencies
npm install

# Seed database
npm run seed

# Terminal 1: Start API (http://localhost:3000)
npm run start:api

# Terminal 2: Start Dashboard (http://localhost:4200)
npm run start:dashboard
```

### Demo Credentials

```
owner@demo   / Password123!  (OWNER role, Org A)
admin@demo   / Password123!  (ADMIN role, Org A)
viewer@demo  / Password123!  (VIEWER role, Org A)
child@demo   / Password123!  (ADMIN role, Org B - child of A)
```

---

## Environment Variables

Create `.env` file in root (optional, defaults provided):

```bash
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=24h
PORT=3000
NODE_ENV=development
```

Database: SQLite (`database.db` - created automatically)

---

## Architecture

### Nx Monorepo Structure

```
lzejnullahu-3f2c9d1a-7b4e-4e2f-9f5d-2c8a6d4c1e90/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── entities/       # TypeORM entities
│   │   │   ├── auth/           # Authentication module
│   │   │   ├── tasks/          # Tasks module
│   │   │   ├── audit-log/      # Audit logging module
│   │   │   ├── common/         # Interceptors, filters
│   │   │   ├── seed.ts         # Database seeding script
│   │   │   └── main.ts         # Application entry point
│   │   └── project.json
│   │
│   └── dashboard/              # Angular frontend
│       ├── src/
│       │   ├── app/
│       │   │   ├── core/       # Services, guards, interceptors
│       │   │   ├── features/   # Login, dashboard components
│       │   │   └── app.routes.ts
│       │   └── main.ts
│       └── project.json
│
├── libs/
│   ├── data/                   # Shared data types
│   │   └── src/lib/
│   │       ├── enums.ts        # Role, Permission, TaskStatus, TaskCategory
│   │       ├── dtos.ts         # Data Transfer Objects
│   │       └── interfaces.ts   # JwtPayload, RequestUser
│   │
│   └── auth/                   # Shared authentication logic
│       └── src/lib/
│           ├── guards/         # JwtAuthGuard, PermissionsGuard
│           ├── decorators/     # @RequirePermissions, @CurrentUser, @OrgScoped
│           ├── strategies/     # JwtStrategy
│           └── helpers/        # Permission mapping, org scoping
│
├── package.json
├── nx.json
├── tsconfig.base.json
└── README.md
```

### Backend (NestJS)

- **auth/**: JWT authentication, login, register
- **tasks/**: CRUD with RBAC enforcement
- **audit-log/**: Request logging
- **entities/**: TypeORM entities (User, Organization, Task, AuditLog)

### Frontend (Angular)

- **Framework**: Angular 17.x with TailwindCSS
- **core/services/**: AuthService, TasksService, TasksStoreService
- **core/guards/**: AuthGuard
- **core/interceptors/**: JWT token interceptor
- **features/**: Login, Dashboard (Kanban board with drag-drop via Angular CDK)

### Shared Libraries

**libs/data**: Type-safe DTOs and enums used by both frontend and backend

- **Enums**: `Role`, `Permission`, `TaskStatus`, `TaskCategory`
- **DTOs**: `LoginDto`, `RegisterDto`, `CreateTaskDto`, `UpdateTaskDto`, `TaskResponseDto`, `AuditLogResponseDto`
- **Interfaces**: `JwtPayload`, `RequestUser`

**libs/auth**: Reusable authentication and authorization logic

- **Guards**: `JwtAuthGuard` (validates JWT), `PermissionsGuard` (checks permissions)
- **Decorators**: `@RequirePermissions()`, `@CurrentUser()`, `@OrgScoped()`
- **Strategies**: `JwtStrategy` (Passport JWT strategy)
- **Helpers**: Role-to-permissions mapping, org scoping, ownership rules

---

## Data Model

### Entity Relationship Diagram (ASCII)

```
┌─────────────────┐
│  Organization   │
├─────────────────┤
│ id (PK)         │
│ name            │
│ parentId (FK)   │◄──┐
└─────────────────┘   │ Self-referencing
         │            │ (parent/child)
         │            │
         ▼            │
┌─────────────────┐   │
│      User       │   │
├─────────────────┤   │
│ id (PK)         │   │
│ email (unique)  │   │
│ passwordHash    │   │
│ name            │   │
│ role (enum)     │   │
│ orgId (FK)      │───┘
└─────────────────┘
         │
         │ createdBy
         ▼
┌─────────────────┐
│      Task       │
├─────────────────┤
│ id (PK)         │
│ title           │
│ description     │
│ category (enum) │
│ status (enum)   │
│ orderIndex      │
│ dueDate         │
│ orgId (FK)      │───┐
│ createdBy (FK)  │───┤
│ updatedBy (FK)  │   │
│ createdAt       │   │
│ updatedAt       │   │
└─────────────────┘   │
                      │
         ┌────────────┘
         │
         ▼
┌─────────────────┐
│   AuditLog      │
├─────────────────┤
│ id (PK)         │
│ ts              │
│ userId (FK)     │
│ action          │
│ resource        │
│ resourceId      │
│ allowed         │
│ reason          │
│ meta (JSON)     │
└─────────────────┘
```

### Entities

**Organization**

- Supports 2-level hierarchy (parent/child)
- Example: "Org A" (parent) → "Org B" (child of A)

**User**

- Belongs to one organization
- Has one role: OWNER, ADMIN, or VIEWER
- Password stored as bcrypt hash

**Task**

- Belongs to one organization
- Has category (WORK, PERSONAL, URGENT, LOW_PRIORITY)
- Has status (TODO, IN_PROGRESS, DONE)
- Tracks creator and last updater
- `orderIndex` field for drag-drop sorting

**AuditLog**

- Records all operations on tasks and audit-log endpoints
- Tracks success (`allowed: true`) and failures (`allowed: false`)
- Stores denial reasons for failed operations

---

## Access Control

### Roles and Permissions

| Role   | Permissions                                                            |
| ------ | ---------------------------------------------------------------------- |
| VIEWER | `TASK_VIEW`                                                            |
| ADMIN  | `TASK_VIEW`, `TASK_CREATE`, `TASK_UPDATE`, `TASK_DELETE`, `AUDIT_VIEW` |
| OWNER  | `TASK_VIEW`, `TASK_CREATE`, `TASK_UPDATE`, `TASK_DELETE`, `AUDIT_VIEW` |

**Permission Inheritance**: OWNER >= ADMIN >= VIEWER (superset pattern)

### Organization Scoping

**Rules:**

1. **OWNER in parent org**: Can access resources in parent org and all child orgs
2. **ADMIN/VIEWER**: Can only access resources in their own org
3. **Child org users**: Cannot access parent org resources

**Example:**

- Owner in Org A (parent) → Can see tasks from Org A and Org B (child)
- Admin in Org B (child) → Can only see tasks from Org B

### Ownership Rules

**Task Modification:**

- **VIEWER**: Cannot modify any tasks
- **ADMIN**: Can only modify tasks they created (`createdBy === userId`)
- **OWNER**: Can modify any task in accessible organizations

**Example:**

```
Task created by User 1 (OWNER)
- User 1 (OWNER): Can update/delete
- User 2 (ADMIN): Cannot update/delete (not creator)
- User 3 (VIEWER): Cannot update/delete (no permission)

Task created by User 2 (ADMIN)
- User 1 (OWNER): Can update/delete (owner privilege)
- User 2 (ADMIN): Can update/delete (creator)
- User 3 (VIEWER): Cannot update/delete (no permission)
```

### Access Control Matrix

| Action          | VIEWER | ADMIN (own) | ADMIN (others) | OWNER |
| --------------- | ------ | ----------- | -------------- | ----- |
| View tasks      | Yes    | Yes         | Yes            | Yes   |
| Create task     | No     | Yes         | Yes            | Yes   |
| Update own task | No     | Yes         | N/A            | Yes   |
| Update others   | No     | No          | No             | Yes   |
| Delete own task | No     | Yes         | N/A            | Yes   |
| Delete others   | No     | No          | No             | Yes   |
| View audit logs | No     | Yes         | Yes            | Yes   |

---

## API Documentation

### Base URL

```
http://localhost:3000
```

### Authentication

#### POST /auth/login

Login with email and password, returns JWT token.

**Request:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@demo",
    "password": "Password123!"
  }'
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/register

Register a new user. Requires OWNER role and authentication.

**Request:**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Authorization: Bearer <owner-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@demo",
    "password": "Password123!",
    "name": "New User",
    "organizationId": 1,
    "role": "VIEWER"
  }'
```

**Response:**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GET /auth/me

Get current user profile (requires authentication).

**Request:**

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer <your-token>"
```

**Response:**

```json
{
  "id": 1,
  "email": "owner@demo",
  "orgId": 1,
  "role": "OWNER"
}
```

### Tasks

All task endpoints require authentication via JWT token.

#### GET /tasks

List all tasks (with optional filters). Returns tasks scoped to user's accessible organizations.

**Query Parameters:**

- `status` - Filter by status (TODO, IN_PROGRESS, DONE)
- `category` - Filter by category (WORK, PERSONAL, URGENT, LOW_PRIORITY)
- `search` - Search in title or description
- `sortBy` - Sort field (orderIndex, createdAt, updatedAt, title)
- `sortDir` - Sort direction (ASC, DESC)

**Request:**

```bash
curl "http://localhost:3000/tasks?status=TODO&category=WORK&sortBy=createdAt&sortDir=DESC" \
  -H "Authorization: Bearer <your-token>"
```

**Response:**

```json
[
  {
    "id": 1,
    "title": "Review Q4 Reports",
    "description": "Analyze quarterly performance metrics",
    "status": "TODO",
    "category": "WORK",
    "orderIndex": 0,
    "createdById": 1,
    "organizationId": 1,
    "createdAt": "2026-01-02T20:00:00.000Z",
    "updatedAt": "2026-01-02T20:00:00.000Z"
  }
]
```

#### POST /tasks

Create a new task (requires `TASK_CREATE` permission).

**Request:**

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Task",
    "description": "Task description",
    "category": "WORK",
    "status": "TODO"
  }'
```

#### PUT /tasks/:id

Update an existing task (requires `TASK_UPDATE` permission and ownership check).

**Request:**

```bash
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Task Title",
    "status": "IN_PROGRESS",
    "orderIndex": 5
  }'
```

#### DELETE /tasks/:id

Delete a task (requires `TASK_DELETE` permission and ownership check).

**Request:**

```bash
curl -X DELETE http://localhost:3000/tasks/1 \
  -H "Authorization: Bearer <your-token>"
```

### Audit Logs

#### GET /audit-log

View audit logs (requires `AUDIT_VIEW` permission - OWNER and ADMIN only).

**Request:**

```bash
curl http://localhost:3000/audit-log \
  -H "Authorization: Bearer <your-token>"
```

**Response:**

```json
[
  {
    "id": 1,
    "action": "CREATE",
    "entityType": "Task",
    "entityId": 1,
    "userId": 1,
    "userName": "Owner User",
    "organizationId": 1,
    "allowed": true,
    "reason": null,
    "metadata": {
      "method": "POST",
      "url": "/tasks",
      "duration": 150
    },
    "createdAt": "2026-01-02T20:00:00.000Z"
  },
  {
    "id": 2,
    "action": "DELETE",
    "entityType": "Task",
    "entityId": 1,
    "userId": 3,
    "userName": "Viewer User",
    "organizationId": 1,
    "allowed": false,
    "reason": "Access denied",
    "metadata": {
      "method": "DELETE",
      "url": "/tasks/1",
      "errorType": "ForbiddenException"
    },
    "createdAt": "2026-01-02T20:01:00.000Z"
  }
]
```

---

## Testing

### Backend Tests

```bash
# Run all API tests
npx nx test api

# Run specific test file
npx nx test api --testFile=tasks.service.spec.ts

# Run with coverage
npx nx test api --coverage

# Run specific test suites
npx nx test api --testFile=tasks.controller.spec.ts
npx nx test api --testFile=audit-log.controller.spec.ts
npx nx test api --testFile=audit.interceptor.spec.ts
```

**Test Coverage:**

- RBAC permission mapping and inheritance
- Organization scoping (parent/child access)
- Ownership rules (Admin vs Owner)
- Viewer cannot create/update/delete
- Admin cannot modify others' tasks
- Audit logging (success and failure)
- Authentication (login, token storage)

### Frontend Tests

```bash
# Run all dashboard tests
npx nx test dashboard

# Run specific test file
npx nx test dashboard --testFile=auth.service.spec.ts
npx nx test dashboard --testFile=tasks-store.service.spec.ts

# Run with coverage
npx nx test dashboard --coverage
```

**Test Coverage:**

- Login stores JWT token in localStorage
- HTTP interceptor adds Authorization header
- Tasks store loads and manages state
- CRUD operations update store correctly
- Filters and sorting work as expected

### Run All Tests

```bash
# Run tests for all projects
npx nx run-many --target=test --all

# Run tests with coverage for all projects
npx nx run-many --target=test --all --coverage
```

---

## Future Considerations

### Security Enhancements

- Implement refresh tokens for better security
- Add rate limiting to prevent brute force attacks
- Implement CSRF protection
- Add API key authentication for service-to-service calls
- Implement password reset functionality
- Add two-factor authentication (2FA)
- Implement session management and token revocation

### Features

- Real-time updates using WebSockets
- Task comments and attachments
- Task assignments to specific users
- Email notifications for task updates
- Task due dates and reminders
- Recurring tasks
- Task templates
- Bulk operations (multi-select tasks)
- Export tasks to CSV/PDF
- Advanced search with full-text indexing
- User management UI (create/edit users)

### Performance

- Implement caching (Redis)
- Add pagination for large datasets
- Optimize database queries with indexes
- Implement lazy loading in frontend
- Add service workers for offline support
- Implement virtual scrolling for large lists

### DevOps

- Add Docker and Docker Compose setup
- Implement CI/CD pipeline (GitHub Actions)
- Add end-to-end tests (Playwright/Cypress)
- Set up monitoring and logging (ELK stack)
- Implement health checks and readiness probes
- Add database migrations (TypeORM migrations)
- Set up staging and production environments

### Architecture

- Migrate to PostgreSQL for production
- Implement event sourcing for audit logs
- Add CQRS pattern for complex queries
- Implement microservices architecture
- Add API versioning
- Implement GraphQL API alongside REST
- Add message queue for async operations (RabbitMQ/Redis)
- Multi-level org hierarchy (beyond 2 levels)

### UI/UX

- Add dark mode
- Implement keyboard shortcuts
- Add drag-drop between categories
- Implement Kanban board view
- Add calendar view for tasks
- Implement mobile app (React Native/Ionic)
- Add accessibility improvements (WCAG 2.1)
- Implement internationalization (i18n)

### Analytics

- Add user activity tracking
- Implement task completion metrics
- Add dashboard with charts and statistics
- Implement custom reports
- Add export functionality for analytics

---

## Repository Naming

**Required Format**: `firstInitial+lastName-uuid`

**Current Repository**: `lzejnullahu-3f2c9d1a-7b4e-4e2f-9f5d-2c8a6d4c1e90`

**Example**: `lzejnullahu-a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p` (where `l` is first initial, `zejnullahu` is last name, and the rest is the assigned UUID)

---

## License

MIT
