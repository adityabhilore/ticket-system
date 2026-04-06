# 🎫 Multi-Company Internal Ticketing System

A comprehensive ticketing system designed for service providers to manage support tickets from multiple client companies with role-based access control, SLA tracking, and advanced reporting.

---

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
- [Environment Variables](#environment-variables)
- [User Roles](#user-roles)

---

## ✨ Features

✓ **Multi-tenant Architecture** - Data isolation between companies  
✓ **Role-Based Access Control** - Client, Engineer, Manager roles  
✓ **SLA Management** - Automatic SLA tracking and overdue detection  
✓ **Ticket Lifecycle** - Complete ticket workflow management  
✓ **Real-time Notifications** - Email alerts and in-app notifications  
✓ **File Attachments** - Upload files to tickets  
✓ **Comprehensive Reporting** - Performance dashboards and analytics  
✓ **Audit Logs** - Complete action history  
✓ **CSAT Ratings** - Customer satisfaction tracking  

---

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL 2/Promise** (MySQL database)
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Nodemailer** for email notifications
- **node-cron** for scheduled jobs
- **Multer** for file uploads

### Frontend
- **React 18** with React Router v6
- **Axios** for API calls
- **CSS** styling
- **Recharts** for data visualization

### Database
- **MySQL** (Relational Database)

---

## 📁 Project Structure

```
ticket-system/
├── backend/                 # Node.js Backend
│   ├── config/             # Database & email configuration
│   ├── controllers/        # Route controllers
│   ├── routes/             # API routes
│   ├── services/           # Business logic
│   ├── middleware/         # Auth, error handling, validation
│   ├── models/             # Database schemas
│   ├── jobs/               # Background jobs (SLA Monitor)
│   ├── utils/              # Helper utilities
│   ├── uploads/            # File storage
│   ├── scripts/            # Database setup scripts
│   ├── server.js           # Express app entry point
│   ├── package.json        # Node dependencies
│   └── .env                # Environment variables
│
├── frontend/               # React Frontend
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/
│   │   │   ├── admin/      # Admin dashboard pages
│   │   │   ├── portal/     # Client portal pages
│   │   │   ├── engineer/   # Engineer pages
│   │   │   ├── manager/    # Manager pages
│   │   │   └── ...         # Shared pages
│   │   ├── services/       # API services
│   │   ├── context/        # React context (Auth)
│   │   ├── hooks/          # Custom hooks
│   │   ├── styles/         # CSS stylesheets
│   │   ├── config/         # Configuration
│   │   └── constants/      # Constants
│   ├── package.json        # React dependencies
│   └── .env                # Frontend environment variables
│
├── database/               # Database schemas & setup
│   ├── schema.sql          # MySQL schema
│   └── ...                 # Migration scripts
│
└── docs/                   # Documentation
```

---

## 🗄️ Database Schema

### 📊 Tables Overview

#### **1. Companies**
Store information about all client companies
```
CompanyID (PK)  | INT | Auto-increment
Name            | VARCHAR(255) | Company name
Email           | VARCHAR(255) | Company email (UNIQUE)
Status          | VARCHAR(50) | 'Active' or 'Inactive'
CreatedAt       | DATETIME | Timestamp
UpdatedAt       | DATETIME | Timestamp
```

#### **2. Users**
Store user accounts for both service providers and clients
```
UserID (PK)     | INT | Auto-increment
Name            | VARCHAR(255) | User's name
Email           | VARCHAR(255) | User email
PasswordHash    | VARCHAR(MAX) | Hashed password
CompanyID (FK)  | INT | References Companies
Role            | VARCHAR(50) | 'Client', 'Engineer', or 'Manager'
CreatedAt       | DATETIME | Timestamp
UpdatedAt       | DATETIME | Timestamp
```

**Roles:**
- `Client` - Can create tickets for their company
- `Engineer` - Can view and work on assigned tickets
- `Manager` - Can view all tickets, generate reports, manage users/products

#### **3. Priority**
Ticket priority levels (Low, Medium, High, Urgent)
```
PriorityID (PK) | INT | Auto-increment
Name            | VARCHAR(50) | Priority name (UNIQUE)
SLAHours        | INT | SLA hours for this priority
CreatedAt       | DATETIME | Timestamp
```

#### **4. Status**
Ticket statuses (Open, In Progress, On Hold, Closed, etc.)
```
StatusID (PK)   | INT | Auto-increment
Name            | VARCHAR(50) | Status name (UNIQUE)
Description     | VARCHAR(255) | Status description
CreatedAt       | DATETIME | Timestamp
```

#### **5. Tickets**
Main tickets table
```
TicketID (PK)   | INT | Auto-increment
Title           | VARCHAR(255) | Ticket title
Description     | VARCHAR(MAX) | Ticket description
CompanyID (FK)  | INT | References Companies (Multi-tenant)
CreatedBy (FK)  | INT | References Users (created by)
AssignedTo (FK) | INT | References Users (assigned to engineer)
PriorityID (FK) | INT | References Priority
StatusID (FK)   | INT | References Status
SLADeadline     | DATETIME | Auto-calculated based on priority SLA
IsOverdue       | BIT | 0 or 1 (auto-updated by SLA monitor)
CreatedAt       | DATETIME | Timestamp
UpdatedAt       | DATETIME | Timestamp
```

#### **6. TicketComments**
Comments and updates on tickets
```
CommentID (PK)  | INT | Auto-increment
TicketID (FK)   | INT | References Tickets (ON DELETE CASCADE)
UserID (FK)     | INT | References Users
CommentText     | VARCHAR(MAX) | Comment content
IsInternal      | BIT | 0=public, 1=internal only
CreatedAt       | DATETIME | Timestamp
UpdatedAt       | DATETIME | Timestamp
```

#### **7. Attachments**
Files attached to tickets
```
AttachmentID (PK) | INT | Auto-increment
TicketID (FK)   | INT | References Tickets (ON DELETE CASCADE)
FileName        | VARCHAR(255) | Original filename
FilePath        | VARCHAR(MAX) | Server file path
CreatedAt       | DATETIME | Timestamp
```

#### **8. AuditLogs**
Track all actions (for compliance & debugging)
```
LogID (PK)      | INT | Auto-increment
TicketID (FK)   | INT | References Tickets
Action          | VARCHAR(255) | Action performed
DoneBy (FK)     | INT | References Users
OldValue        | VARCHAR(MAX) | Previous value
NewValue        | VARCHAR(MAX) | New value
CreatedAt       | DATETIME | Timestamp
```

#### **9. Products**
Service products/categories for tickets
```
ProductID (PK)  | INT | Auto-increment
Name            | VARCHAR(255) | Product name
Description     | VARCHAR(MAX) | Product description
CreatedAt       | DATETIME | Timestamp
UpdatedAt       | DATETIME | Timestamp
```

#### **10. Notifications**
Email notification preferences
```
NotificationID (PK) | INT | Auto-increment
UserID (FK)     | INT | References Users
Type            | VARCHAR(50) | Notification type
Enabled         | BIT | 0 or 1
CreatedAt       | DATETIME | Timestamp
```

#### **11. Conversations**
Chat/messaging conversations between users
```
ConversationID (PK) | INT | Auto-increment
TicketID (FK)   | INT | References Tickets
UserID (FK)     | INT | References Users
Subject         | VARCHAR(255) | Conversation topic
CreatedAt       | DATETIME | Timestamp
UpdatedAt       | DATETIME | Timestamp
```

#### **12. Messages**
Individual messages within conversations
```
MessageID (PK)  | INT | Auto-increment
ConversationID (FK) | INT | References Conversations
UserID (FK)     | INT | References Users (sender)
MessageText     | VARCHAR(MAX) | Message content
CreatedAt       | DATETIME | Timestamp
```

#### **13. CompanyProducts**
Association between companies and products (Many-to-Many)
```
CompanyProductID (PK) | INT | Auto-increment
CompanyID (FK)  | INT | References Companies
ProductID (FK)  | INT | References Products
CreatedAt       | DATETIME | Timestamp
```

#### **14. CSATRatings**
Customer Satisfaction ratings for tickets
```
CSATRatingID (PK) | INT | Auto-increment
TicketID (FK)   | INT | References Tickets
UserID (FK)     | INT | References Users
Rating          | INT | 1-5 rating score
Comments        | VARCHAR(MAX) | Feedback comments
CreatedAt       | DATETIME | Timestamp
```

#### **15. EngineerAssignment**
Track engineer assignments and round-robin queue
```
AssignmentID (PK) | INT | Auto-increment
EngineerID (FK) | INT | References Users (Engineer)
TicketID (FK)   | INT | References Tickets
AssignedAt      | DATETIME | When assigned
CompletedAt     | DATETIME | When completed (NULL if pending)
CreatedAt       | DATETIME | Timestamp
```

#### **16. EmailTemplates**
Predefined email templates for notifications
```
TemplateID (PK) | INT | Auto-increment
Name            | VARCHAR(255) | Template name (UNIQUE)
Subject         | VARCHAR(255) | Email subject
Body            | VARCHAR(MAX) | Email HTML body
Type            | VARCHAR(50) | Template type (e.g., 'TICKET_CREATED')
Variables       | VARCHAR(MAX) | JSON of required variables
CreatedAt       | DATETIME | Timestamp
UpdatedAt       | DATETIME | Timestamp
```

#### **17. EmailNotifications**
Log of sent emails
```
EmailNotificationID (PK) | INT | Auto-increment
RecipientEmail  | VARCHAR(255) | Recipient email
TemplateID (FK) | INT | References EmailTemplates
TicketID (FK)   | INT | References Tickets (NULL if not ticket-related)
Subject         | VARCHAR(255) | Email subject
Body            | VARCHAR(MAX) | Email content
Status          | VARCHAR(50) | 'Sent', 'Failed', 'Pending'
SentAt          | DATETIME | When email was sent
CreatedAt       | DATETIME | Timestamp
```

---

### 📊 Complete Table Summary

| Table | Purpose |
|-------|---------|
| **Companies** | Client company information |
| **Users** | User accounts (Client, Engineer, Manager) |
| **Tickets** | Support tickets |
| **TicketComments** | Comments on tickets |
| **Status** | Ticket statuses (Open, In Progress, etc.) |
| **Priority** | Priority levels with SLA hours |
| **Attachments** | Files attached to tickets |
| **AuditLogs** | Action history for compliance |
| **Notifications** | User notification preferences |
| **Products** | Service products/categories |
| **CompanyProducts** | Company-Product associations |
| **Conversations** | Chat conversations between users |
| **Messages** | Individual messages in conversations |
| **CSATRatings** | Customer satisfaction feedback |
| **EngineerAssignment** | Engineer assignment tracking |
| **EmailTemplates** | Reusable email templates |
| **EmailNotifications** | Sent email log |

**Total: 17 Tables** ✓

---

### 🔗 Key Relationships

```
Companies (1) ──→ (Many) Users
Users (1) ──→ (Many) Tickets (as CreatedBy)
Users (1) ──→ (Many) Tickets (as AssignedTo)
Tickets (1) ──→ (Many) TicketComments
Tickets (1) ──→ (Many) Attachments
Tickets (1) ──→ (Many) AuditLogs
Priority (1) ──→ (Many) Tickets
Status (1) ──→ (Many) Tickets
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- Git

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/ticket-system.git
cd ticket-system
```

### 2. Backend Setup
```bash
cd backend
npm install
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Database Setup

**Create MySQL database:**
```bash
mysql -u root -p < database/schema.sql
```

Or manually in MySQL:
```sql
CREATE DATABASE TicketingSystem CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 5. Environment Variables

**Create `.env` in `/backend`:**
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=TicketingSystem
DB_PORT=3306

# Server
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=your_secret_key_123
JWT_EXPIRE=7d

# Email (Optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

---

## ▶️ Running the Application

### Start Backend Server
```bash
cd backend
npm run dev    # Development mode with nodemon
# or
npm start      # Production mode
```
Backend runs on: `http://localhost:5000`

### Start Frontend
```bash
cd frontend
npm start
```
Frontend runs on: `http://localhost:3000`

---

## 🔐 Environment Variables

### Backend (`.env`)
```
DB_HOST              - MySQL server hostname
DB_USER              - MySQL username
DB_PASSWORD          - MySQL password
DB_DATABASE          - Database name
DB_PORT              - MySQL port (default: 3306)
PORT                 - Express server port (default: 5000)
NODE_ENV             - 'development' or 'production'
JWT_SECRET           - Secret key for JWT tokens
JWT_EXPIRE           - JWT expiration time (e.g., '7d')
EMAIL_USER           - Email for sending notifications
EMAIL_PASSWORD       - Email app password
```

### Frontend (`.env`)
```
REACT_APP_API_URL    - Backend API URL (e.g., http://localhost:5000/api)
```

---

## 👥 User Roles

### **Client**
- Access: `/portal`
- Can create tickets
- Can view their own tickets
- Can comment and add attachments
- Can view reports (their tickets only)

### **Engineer**
- Access: `/dashboard`
- View assigned tickets
- Update ticket status
- Add comments
- Manage ticket workflow

### **Manager**
- Access: `/admin`
- Full dashboard access
- View all tickets
- Manage users & companies
- Manage SLA & products
- Generate comprehensive reports
- Audit logs access

### **Admin**
- Create system users
- Manage companies
- Configure system settings
- Generate audit reports

---

## 📝 Important Notes

✓ Database files (`.sql`) are NOT included in Git  
✓ `.env` file should never be committed (included in `.gitignore`)  
✓ For local development, MySQL must be running  
✓ All passwords are hashed with bcryptjs  
✓ JWT tokens expire after configured time  

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m "Add feature description"`
4. Push: `git push origin feature/your-feature`
5. Create a Pull Request

---

## 📄 License

This project is proprietary and confidential.

---

## 📞 Support

For issues or questions, contact the development team.

---

**Last Updated:** April 2026  
**Version:** 1.0.0
