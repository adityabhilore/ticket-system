# Multi-Company Internal Ticketing System
## Complete Project Documentation

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Setup Instructions](#setup-instructions)
5. [API Documentation](#api-documentation)
6. [Database Schema](#database-schema)
7. [Frontend Structure](#frontend-structure)
8. [Features](#features)
9. [Security](#security)
10. [Deployment](#deployment)

---

## 🎯 Project Overview

The **Multi-Company Internal Ticketing System** is a web-based application designed for service provider companies to manage support tickets from multiple client companies. The system supports:

- **Multi-tenant architecture** - Each company's data is isolated
- **Role-based access control** - Client, Engineer, Manager roles
- **SLA management** - Automatic SLA tracking and overdue detection
- **Comprehensive reporting** - Performance and compliance dashboards
- **Real-time updates** - Live ticket status and comments

### Key Objectives:
✓ Manage support tickets from multiple external companies
✓ Track ticket lifecycle from creation to closure
✓ Monitor SLA compliance and deadlines
✓ Provide performance analytics to managers
✓ Ensure data security and isolation between companies

---

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQL Server** - Relational database
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing
- **node-cron** - Background job scheduling
- **multer** - File upload handling

### Frontend
- **React.js** - UI library
- **React Router** - Navigation
- **Axios** - HTTP client
- **CSS3** - Styling

### Database
- **SQL Server 2019** or later
- **T-SQL** - Query language

---

## 🏗️ Architecture

### Overall Architecture

```
┌─────────────────┐          ┌──────────────────┐
│   React App     │  HTTP   │  Express Server  │
│  (Port 3000)    │ ◄─────► │  (Port 5000)     │
└─────────────────┘          └──────────────────┘
                                      │
                             ┌────────▼────────┐
                             │  SQL Server     │
                             │  (Multi-tenant) │
                             └─────────────────┘
```

### Backend Folder Structure

```
backend/
├── controllers/          # Request handlers
│   ├── authController.js
│   ├── ticketController.js
│   ├── userController.js
│   ├── companyController.js
│   └── reportController.js
├── routes/              # API route definitions
│   ├── authRoutes.js
│   ├── ticketRoutes.js
│   ├── userRoutes.js
│   ├── companyRoutes.js
│   └── reportRoutes.js
├── services/            # Business logic
│   ├── userService.js
│   ├── ticketService.js
│   ├── commentService.js
│   ├── attachmentService.js
│   ├── companyService.js
│   └── reportService.js
├── middleware/          # Custom middleware
│   ├── authMiddleware.js
│   ├── errorHandler.js
│   └── validationMiddleware.js
├── utils/               # Utility functions
│   ├── auth.js
│   └── sla.js
├── jobs/                # Scheduled jobs
│   └── slaMonitor.js
├── config/
│   └── database.js
├── server.js            # Main server file
├── package.json
└── .env.example
```

### Frontend Folder Structure

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Layout.js
│   │   └── ProtectedRoute.js
│   ├── pages/            # Page components
│   │   ├── Login.js
│   │   ├── Dashboard.js
│   │   ├── TicketList.js
│   │   ├── CreateTicket.js
│   │   └── TicketDetails.js
│   ├── services/         # API services
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── ticketService.js
│   │   ├── userService.js
│   │   ├── reportService.js
│   │   └── companyService.js
│   ├── context/          # React Context
│   │   └── AuthContext.js
│   ├── hooks/            # Custom hooks
│   │   └── useAuth.js
│   ├── styles/
│   │   └── main.css
│   ├── utils/
│   │   └── helpers.js
│   ├── App.js
│   └── index.js
├── public/
│   └── index.html
├── package.json
└── .env.example
```

---

## 📋 Setup Instructions

### Prerequisites
- Node.js (v14+)
- npm or yarn
- SQL Server (2019 or later)
- Git

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env` file**
```bash
cp .env.example .env
```

4. **Update `.env` with your database details**
```
DB_SERVER=localhost
DB_DATABASE=TicketingSystem
DB_USER=sa
DB_PASSWORD=YourPassword123
DB_PORT=1433
JWT_SECRET=your_secure_secret_key
PORT=5000
```

5. **Create database schema**
- Open SQL Server Management Studio
- Execute the script from `database/schema.sql`

6. **Start the backend server**
```bash
npm start
```
or for development with auto-reload:
```bash
npm run dev
```

Server will run at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create `.env` file**
```bash
cp .env.example .env
```

4. **Update `.env` if needed**
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

5. **Start the development server**
```bash
npm start
```

App will open at `http://localhost:3000`

### Test Login Credentials

After running the database schema:
```
Email: client1@techcorp.com
Role: Client
(Password needs to be updated in DB)

Email: alice@techcorp.com
Role: Engineer
(Password needs to be updated in DB)

Email: john.admin@techcorp.com
Role: Manager
(Password needs to be updated in DB)
```

---

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/login`
Login user and get JWT token
```json
Request:
{
  "email": "user@company.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "userId": 1,
      "name": "John Doe",
      "email": "john@company.com",
      "role": "Manager"
    }
  }
}
```

#### GET `/api/auth/me`
Get current user info (requires authentication)
```json
Response:
{
  "success": true,
  "data": {
    "userId": 1,
    "name": "John Doe",
    "email": "john@company.com",
    "role": "Manager"
  }
}
```

### Ticket Endpoints

#### POST `/api/tickets`
Create new ticket
```json
Request:
{
  "title": "Login not working",
  "description": "Users unable to login to the system",
  "priorityId": 2
}
```

#### GET `/api/tickets`
Get user's tickets based on role
```
Query params:
- status: ticket status id
- priority: priority id
```

#### GET `/api/tickets/:ticketId`
Get ticket details with comments and attachments

#### PUT `/api/tickets/:ticketId/status`
Update ticket status (Engineer/Manager only)
```json
{
  "statusId": 2
}
```

#### PUT `/api/tickets/:ticketId/assign`
Assign ticket to engineer (Manager only)
```json
{
  "engineerId": 5
}
```

#### POST `/api/tickets/:ticketId/comments`
Add comment to ticket
```json
{
  "commentText": "Working on this issue",
  "isInternal": false
}
```

### User Endpoints

#### GET `/api/users`
Get all users in company

#### GET `/api/users/engineers`
Get all engineers in company

#### PUT `/api/users/profile`
Update user profile
```json
{
  "name": "John Updated",
  "email": "newemail@company.com"
}
```

### Report Endpoints

#### GET `/api/reports/dashboard`
Get dashboard data

#### GET `/api/reports/sla`
Get SLA compliance report

#### GET `/api/reports/performance`
Get engineer performance (Manager only)

#### GET `/api/reports/trending`
Get ticket trends (last 30 days)

---

## 🗄️ Database Schema

### Companies Table
```sql
- CompanyID (PK)
- Name
- Email
- Status
- CreatedAt
```

### Users Table
```sql
- UserID (PK)
- Name
- Email
- PasswordHash
- CompanyID (FK)
- Role (Client, Engineer, Manager)
- CreatedAt
```

### Tickets Table
```sql
- TicketID (PK)
- Title
- Description
- CompanyID (FK)
- CreatedBy (FK)
- AssignedTo (FK)
- PriorityID (FK)
- StatusID (FK)
- SLADeadline
- IsOverdue
- CreatedAt
```

### TicketComments Table
```sql
- CommentID (PK)
- TicketID (FK)
- UserID (FK)
- CommentText
- IsInternal (0/1)
- CreatedAt
```

### Priority Table
```sql
- PriorityID (PK)
- Name (Critical, High, Medium, Low)
- SLAHours
```

### Status Table
```sql
- StatusID (PK)
- Name (Open, In Progress, Resolved, Closed)
```

---

## 🎨 Frontend Features

### Login Page
- Email and password authentication
- Error handling
- Session persistence

### Dashboard
- **Client View:**
  - Total tickets
  - Open tickets count
  - Closed tickets count
  - SLA compliance percentage

- **Manager View:**
  - All companies overview
  - Global ticket counts
  - Company-wise statistics

### Ticket List
- Filter by status and priority
- Display all ticket details
- Quick access to ticket details
- Color-coded status badges

### Create Ticket
- Title and description input
- Priority selection (with SLA hours)
- Form validation
- Success confirmation

### Ticket Details
- Full ticket information
- Comments section (public/internal)
- Status update (Engineer/Manager)
- Engineer assignment (Manager only)
- SLA countdown timer
- Attachment display

### Layout
- Responsive sidebar navigation
- User profile display
- Role-based menu items
- Quick logout

---

## 🔒 Security Features

### Authentication & Authorization
✓ JWT-based token authentication
✓ Role-based access control (RBAC)
✓ Password hashing using bcryptjs
✓ Token expiration (7 days default)

### Data Protection
✓ Company data isolation (multi-tenant)
✓ Input validation on client and server
✓ SQL parameterization to prevent injection
✓ CORS vulnerability prevention

### Best Practices
✓ Environment variables for sensitive data
✓ HTTPS-ready architecture
✓ Error messages don't expose system details
✓ Secure password requirements

---

## 📊 SLA Monitoring

### SLA Levels
```
Critical:   4 hours
High:       8 hours
Medium:     24 hours
Low:        48 hours
```

### SLA Job
- Runs every hour
- Identifies tickets exceeding SLA deadline
- Marks tickets as overdue
- Triggers notifications (can be enhanced)

### Countdown Display
- Real-time SLA countdown on ticket details
- Color coding:
  - Green: Within SLA
  - Red: Overdue

---

## 🚀 Deployment

### Backend Deployment (Heroku Example)

1. Install Heroku CLI
2. Create Heroku app: `heroku create app-name`
3. Set environment variables:
```bash
heroku config:set DB_SERVER=your-server.database.windows.net
heroku config:set DB_PASSWORD=your-password
heroku config:set JWT_SECRET=your-secret
```
4. Deploy: `git push heroku main`

### Frontend Deployment (Vercel Example)

1. Install Vercel CLI
2. Deploy: `vercel`
3. Set environment variables in Vercel dashboard

### Database
- Use Azure SQL Database or similar cloud service
- Ensure firewall rules allow application access
- Regular backups recommended

---

## 🐛 Troubleshooting

### Backend won't start
- Check Node.js version: `node --version`
- Verify .env file exists and is configured
- Check SQL Server connection: `npm run test-db`

### Frontend won't load
- Clear browser cache and localStorage
- Check REACT_APP_API_URL in .env
- Verify backend is running on port 5000

### Authentication issues
- Verify JWT_SECRET is consistent
- Check browser console for token errors
- Clear localStorage and re-login

### Database connection errors
- Verify SQL Server is running
- Check network connectivity
- Verify firewall rules
- Test connection string in SSMS

---

## 📝 Future Enhancements

1. **Email Notifications**
   - SLA breach notifications
   - Comment notifications
   - Status update emails

2. **Advanced Reporting**
   - Custom report builder
   - Export to PDF/Excel
   - Scheduled report delivery

3. **Mobile App**
   - React Native mobile version
   - Push notifications

4. **Real-time Updates**
   - WebSocket integration
   - Live notification system

5. **Integration**
   - Slack/Teams integration
   - Email ticketing support
   - API for third-party services

6. **AI Features**
   - Smart ticket assignment
   - Automated categorization
   - Sentiment analysis

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review API documentation
3. Check browser/server console logs
4. Contact development team

---

## 📄 License

This project is private and confidential.

---

**Last Updated:** March 2026
**Version:** 1.0.0
