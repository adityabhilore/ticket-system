# Architecture Documentation
## Multi-Company Internal Ticketing System

---

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  React.js (Port 3000)                                        │
│  - Components (Login, Dashboard, Tickets, etc.)              │
│  - Context API (Auth State)                                  │
│  - Axios (HTTP Client)                                       │
│  - React Router (Navigation)                                 │
└─────────────────────────────────────────────────────────────┘
                           ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    API GATEWAY LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Express.js (Port 5000)                                      │
│  - CORS Middleware                                           │
│  - JSON Body Parser                                          │
│  - Router (Routes registration)                              │
│  - Error Handler Middleware                                  │
└─────────────────────────────────────────────────────────────┘
                           ↕ Internal Routes
┌─────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                         │
├─────────────────────────────────────────────────────────────┤
│  Controllers                                                  │
│  - authController     - ticketController                     │
│  - userController     - reportController                     │
│  - companyController                                         │
│                                                               │
│  Middleware                                                   │
│  - authMiddleware (JWT verification)                         │
│  - validationMiddleware (Input validation)                   │
│  - errorHandler (Error handling)                             │
└─────────────────────────────────────────────────────────────┘
                           ↕ Service Layer
┌─────────────────────────────────────────────────────────────┐
│                   SERVICES LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  - userService        - reportService                        │
│  - ticketService      - companyService                       │
│  - commentService     - attachmentService                    │
│                                                               │
│  Business Logic & Data Processing                            │
└─────────────────────────────────────────────────────────────┘
                           ↕ Database Layer
┌─────────────────────────────────────────────────────────────┐
│                  DATA ACCESS LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  Database.js (Connection Pool & Query Execution)             │
│  - Connection pooling                                        │
│  - Query parameterization                                    │
│  - Error handling                                            │
└─────────────────────────────────────────────────────────────┘
                           ↕ SQL
┌─────────────────────────────────────────────────────────────┐
│                   STORAGE LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  SQL Server Database                                          │
│  - Companies Table                                            │
│  - Users Table (with role-based access)                      │
│  - Tickets Table (with SLA deadline)                         │
│  - Comments Table (public & internal)                        │
│  - Priority, Status, Attachments, AuditLogs Tables           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### Example: User Creating a Ticket

```
1. USER INTERACTION
   Client clicks "Create Ticket" → Form submitted

2. FRONTEND (React)
   - Form validation in CreateTicket.js
   - Call ticketService.createTicket()
   - Axios adds Authorization header with JWT token
   - POST request to http://localhost:5000/api/tickets

3. BACKEND (Node.js)
   a) Express receives request
   b) Middleware chain:
      - Body parser (parse JSON)
      - verifyToken (middleware) - validates JWT
      - createTicketValidationRules() - validates input
      - handleValidationErrors() - shows validation errors
   
   c) Route dispatcher routes to ticketController.createNewTicket()
   
4. CONTROLLER (ticketController.js)
   - Validates request data
   - Extracts userId, companyId from JWT token
   - Calls ticketService.createTicket()
   - Returns response

5. SERVICE (ticketService.js)
   - Business logic:
     * Gets SLA hours for priority
     * Calculates SLA deadline
     * Calls database layer
   
6. DATABASE LAYER (database.js)
   - Executes SQL query with parameters:
     INSERT INTO Tickets (Title, Description, CompanyID, ...)
   - Returns rows affected count
   - Returns newly created ticketId

7. RESPONSE FLOW (Back up the chain)
   Service → Controller → Express Middleware → HTTP Response
   
8. FRONTEND RECEIVES
   {
     "success": true,
     "data": { "ticketId": 45 }
   }
   
9. UI UPDATES
   - Show success message
   - Redirect to ticket details
   - Clear form

TOTAL TIME: ~200-500ms
```

---

## 🔐 Authentication Flow

```
┌──────────────────────────────────────────────────────┐
│ 1. User Enters Credentials                            │
│    Email: user@company.com                            │
│    Password: password123                              │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 2. Frontend: authService.login()                      │
│    POST /api/auth/login                               │
│    Body: { email, password }                          │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 3. Backend: authController.login()                    │
│    - Find user by email                               │
│    - Compare password with hash (bcryptjs)            │
│    - If invalid → 401 error                           │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 4. Generate JWT Token                                 │
│    Payload: {                                         │
│      userId: 1,                                       │
│      companyId: 1,                                    │
│      role: "Manager"                                  │
│    }                                                  │
│    Signed with JWT_SECRET                             │
│    Expires in 7 days                                  │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 5. Response to Frontend                               │
│    {                                                  │
│      "token": "eyJhbGc...",                          │
│      "user": { userId, name, email, role }           │
│    }                                                  │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 6. Frontend Stores Token                              │
│    localStorage.setItem('token', token)               │
│    localStorage.setItem('user', userObj)              │
│    AuthContext updated                                │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 7. Subsequent Requests                                │
│    Every API call includes:                           │
│    Authorization: Bearer {token}                      │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 8. Backend Verification                               │
│    authMiddleware.verifyToken() does:                 │
│    - Extract token from header                        │
│    - Verify signature with JWT_SECRET                 │
│    - Check expiration                                 │
│    - Extract userId, companyId, role                  │
│    - Attach to request object                         │
│    - Call next() to continue                          │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 9. Authorization Check                                │
│    authorize(['Manager']) middleware:                 │
│    - Check if user.role in allowed list               │
│    - If not → 403 Forbidden                           │
│    - If yes → Call next()                             │
└──────────────────────────────────────────────────────┘
                        ↓
┌──────────────────────────────────────────────────────┐
│ 10. Data Isolation                                    │
│     companyFilter middleware:                         │
│     - Attach companyId to request                     │
│     - All queries only return company's data          │
│     - Prevents cross-company data access              │
└──────────────────────────────────────────────────────┘
```

---

## 💾 Data Flow & Multi-Tenancy

### Company Data Isolation

```
DATABASE (SQL Server)
├── Tickets Table
│   ├── ID: 1, CompanyID: 1, Title: "Issue A"
│   ├── ID: 2, CompanyID: 2, Title: "Issue B"
│   └── ID: 3, CompanyID: 1, Title: "Issue C"
│
├── Users Table
│   ├── ID: 1, CompanyID: 1, Name: "John", Role: "Manager"
│   ├── ID: 2, CompanyID: 1, Name: "Alice", Role: "Engineer"
│   └── ID: 3, CompanyID: 2, Name: "Bob", Role: "Manager"
│
└── Comments Table
    ├── ID: 1, TicketID: 1, UserID: 1, Text: "..."
    ├── ID: 2, TicketID: 2, UserID: 3, Text: "..."
    └── ID: 3, TicketID: 3, UserID: 2, Text: "..."

SCENARIO: User from Company 1 (John) makes request

JWT Token contains: { userId: 1, companyId: 1, role: "Manager" }

Query for Tickets:
  BEFORE: SELECT * FROM Tickets  ← Returns all 3 tickets (WRONG!)
  AFTER:  SELECT * FROM Tickets WHERE CompanyID = 1  ← Returns only tickets 1,3

Result: John only sees his company's data!
        Company 2's tickets are completely hidden.
```

### Middleware Chain for Company Isolation

```
Request comes in with JWT token
    ↓
verifyToken() - Extracts companyId from JWT
    ↓
companyFilter() - Adds companyId to request object
    ↓
Controller receives request with req.companyId = 1
    ↓
Service gets companyId from controller:
    const tickets = await ticketService.getTickets(companyId)
    ↓
Service queries database WITH company filter:
    SELECT * FROM Tickets WHERE CompanyID = ? [param: companyId]
    ↓
Only company 1's data returned
    ↓
Client only sees their company's tickets
```

---

## 🎯 Role-Based Access Control (RBAC)

```
ENDPOINT: GET /api/tickets/:id

┌─────────────────────────────────────────────┐
│ verifyToken()                               │
│ ✓ Checks JWT                                │
│ ✓ Extracts role                             │
│ ✓ Calls next() to continue                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ authorize(['Client','Engineer','Manager'])  │
│ ✓ Check if req.role in allowed roles        │
│ ✗ If NOT in list → 403 Forbidden            │
│ ✓ If in list → next()                       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ Controller: getTicketDetails()               │
│ - Fetch ticket by ID                        │
│ - Apply company filter                      │
│ - Check role-specific logic:                │
│   • Client: can only see own tickets        │
│   • Engineer: can see assigned tickets      │
│   • Manager: can see all tickets            │
└─────────────────────────────────────────────┘


ENDPOINT: PUT /api/tickets/:id/assign

Authz Chain:
1. verifyToken() → Extract role
2. authorize(['Manager']) → Only managers
3. Controller → Assign ticket
4. Service → Update database
   
If Engineer tries: 403 Forbidden
If Manager tries: ✓ Allowed
```

---

## ⏰ SLA Management System

```
FLOW: Ticket Lifecycle with SLA

1. TICKET CREATION
   User creates ticket with priority "High"
   ↓
   System queries: SELECT SLAHours FROM Priority WHERE ID = 2
   Result: 8 hours
   ↓
   Calculate deadline: NOW() + 8 hours
   Store in: Tickets.SLADeadline = 2024-01-16 14:30:00
   ↓
   Example:
   Created:     2024-01-16 06:30:00
   SLAHours:    8
   Deadline:    2024-01-16 14:30:00

2. TICKET DISPLAY
   Frontend receives ticket details
   ↓
   JavaScript calculates countdown:
   Now() - Deadline = remaining time
   ↓
   Displays countdown: "7h 45m 30s"

3. SLA MONITORING JOB (Runs every hour)
   
   cron.schedule('0 * * * *', async () => {
     // Find all open tickets
     // Check if SLADeadline < NOW()
     // Mark as IsOverdue = 1
   })
   
   Pseudocode:
   UPDATE Tickets
   SET IsOverdue = 1, UpdatedAt = GETDATE()
   WHERE SLADeadline < GETDATE()
   AND IsOverdue = 0
   AND StatusID != 4 (not closed)

4. STATUS INDICATORS
   
   Color coding in UI:
   IsOverdue = 0 → Green ✓
   IsOverdue = 1 → Red ✗
   
   SLACountdown:
   > 0 hours remaining → Normal
   Overdue → "OVERDUE" in red

5. EXAMPLE PROGRESSION
   
   10:00 AM - Ticket created, Priority HIGH (8 hour SLA)
   Deadline: 6:00 PM
   
   11:00 AM - Assigned to Engineer
   Time remaining: 7h
   
   4:00 PM - Status changed to "In Progress"
   Time remaining: 2h
   
   6:15 PM - Still "In Progress"
   Status: OVERDUE (15 minutes past deadline)
   IsOverdue flag set = 1
   
   6:45 PM - Status changed to "Resolved"
   Remaining time: negative
   SLA breached
   
   7:00 PM - Status changed to "Closed"
   Ticket completed but SLA was breached
   Report shows: SLA not met
```

---

## 🔄 Component Interaction

### Frontend Component Tree

```
App.js (Main)
├── AuthProvider
│   ├── Login.js
│   │   └── authService.login()
│   │       └── axios POST /api/auth/login
│   │
│   └── Layout.js (If authenticated)
│       ├── Sidebar Navigation
│       │   ├── Dashboard link
│       │   ├── Tickets link
│       │   ├── Create Ticket link (Client/Engineer only)
│       │   ├── Overdue link (Manager only)
│       │   └── Reports link (Manager only)
│       │
│       └── Main Content (Protected Routes)
│           ├── Dashboard.js
│           │   └── reportService.getDashboard()
│           │
│           ├── TicketList.js
│           │   └── ticketService.getTickets()
│           │       └── Display with filters
│           │
│           ├── CreateTicket.js
│           │   └── ticketService.createTicket()
│           │
│           └── TicketDetails.js
│               ├── ticketService.getTicketDetails()
│               ├── userService.getEngineers() (Manager only)
│               └── Comment section
│                   └── ticketService.addComment()

Custom Hooks:
├── useAuth() → AuthContext
├── useRole() → Get user role
└── useAuthorize() → Check if role allowed

Services:
├── authService → Login/logout
├── ticketService → CRUD tickets
├── userService → User management
├── reportService → Analytics
└── api.js → HTTP client with token injection
```

### Backend Request Handling

```
Request arrives at Express server
↓
Express routing:
app.use('/api/tickets', ticketRoutes)
↓
ticketRoutes.js maps:
GET /
POST /
GET /:id
PUT /:id/status
etc.
↓
Middleware chain executes left to right:
1. verifyToken(req, res, next)
2. authorize(['role1', 'role2'])(req, res, next)
3. companyFilter(req, res, next)
4. Controller: ticketController.getTicketsList
↓
Controller calls service:
const tickets = await ticketService.getTickets(companyId)
↓
Service calls database:
const result = await database.query(sql, params)
↓
Result returned up the chain
↓
Controller formats response
↓
Send HTTP response to client
```

---

## 🗄️ Database Relationships

```
Companies (1) ──────→ (Many) Users
    ↓
    └─────────→ (Many) Tickets
                  ↓
                  ├─→ (1) Users (CreatedBy)
                  ├─→ (1) Users (AssignedTo)
                  ├─→ (1) Priority
                  ├─→ (1) Status
                  ├─→ (Many) TicketComments
                  │     └─→ (1) Users
                  ├─→ (Many) Attachments
                  └─→ (Many) AuditLogs
                        └─→ (1) Users

Priority
├─ Critical (4 hours)
├─ High (8 hours)
├─ Medium (24 hours)
└─ Low (48 hours)

Status
├─ 1: Open
├─ 2: In Progress
├─ 3: Resolved
└─ 4: Closed

User Roles
├─ Client (can create, view own)
├─ Engineer (can work on, assign own)
└─ Manager (can manage all)
```

---

## 🔒 Security Layers

```
Layer 1: HTTPS/TLS
├─ Encrypt data in transit
└─ Required for production

Layer 2: CORS
├─ Control which domains can access API
└─ Prevent unauthorized browser requests

Layer 3: Authentication
├─ JWT tokens
├─ Token expiration (7 days)
└─ Token verification on each request

Layer 4: Authorization
├─ Role-based access control
├─ Endpoint permissions
└─ 403 Forbidden if unauthorized

Layer 5: Data Isolation
├─ Company filter on all queries
├─ Users can only see their company's data
└─ Query parameterization

Layer 6: Input Validation
├─ Client-side validation
├─ Server-side validation
└─ Express-validator

Layer 7: Password Security
├─ bcryptjs hashing
├─ 10 salt rounds
└─ Never stored in plain text

Layer 8: Error Handling
├─ Generic error messages to client
├─ Detailed logs for admins
└─ No sensitive data in errors
```

---

## 📊 Scalability Considerations

```
CURRENT ARCHITECTURE
│
├─ Single Node.js Process
│  ├─ Handles up to ~1000 concurrent users
│  ├─ Single CPU core
│  └─ Not load balanced
│
├─ Single SQL Server Database
│  ├─ Connection pooling (max 10 connections)
│  ├─ Indexes on frequently queried columns
│  └─ Handles millions of records
│
└─ Single Frontend Instance
   └─ Static files served

TO SCALE TO 10,000+ USERS:

1. Backend Scaling
   ├─ Deploy multiple Node instances
   ├─ Use load balancer (Nginx, HAProxy)
   ├─ Implement caching (Redis)
   ├─ Use job queue (Bull, RabbitMQ)
   └─ Enable database connection pooling

2. Database Scaling
   ├─ Add read replicas for reporting
   ├─ Use database sharding for very large tables
   ├─ Implement caching layer
   └─ Regular maintenance & indexing

3. Frontend Scaling
   ├─ Use CDN for static files
   ├─ Implement pagination
   ├─ Lazy load components
   └─ Minify and compress

4. Monitoring
   ├─ APM (New Relic, DataDog)
   ├─ Logging (ELK Stack)
   ├─ Alerting
   └─ Performance metrics
```

---

## 🎯 Design Patterns Used

1. **MVC (Model-View-Controller)**
   - Frontend: React components (View)
   - Backend: Controllers (C), Services (M), Views (API)

2. **Middleware Pattern**
   - Authentication middleware
   - Validation middleware
   - Error handling middleware

3. **Service Layer Pattern**
   - Separation of business logic
   - Reusable services
   - Testable code

4. **Dependency Injection**
   - Services receive dependencies
   - Database connections passed

5. **Context API**
   - Global auth state
   - Avoids prop drilling

6. **Custom Hooks**
   - useAuth() for authentication
   - Reusable logic

7. **Factory Pattern**
   - Connection pooling
   - Request building

---

**Last Updated:** March 2026
**Architecture Version:** 1.0
**Status:** Production-Ready
