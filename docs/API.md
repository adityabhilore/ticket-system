# API Documentation
## Multi-Company Internal Ticketing System

---

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints (except login) require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### 1. AUTHENTICATION

#### Login
**POST** `/auth/login`
```json
{
  "email": "user@company.com",
  "password": "password123"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": 1,
      "name": "John Doe",
      "email": "john@company.com",
      "companyId": 1,
      "role": "Manager"
    }
  }
}
```

#### Get Current User
**GET** `/auth/me`
**Headers:** Authorization: Bearer {token}

**Response (200):**
```json
{
  "success": true,
  "data": {
    "UserID": 1,
    "Name": "John Doe",
    "Email": "john@company.com",
    "CompanyID": 1,
    "Role": "Manager",
    "CreatedAt": "2023-01-15T10:30:00Z"
  }
}
```

---

### 2. TICKETS

#### Create Ticket
**POST** `/tickets`
**Headers:** Authorization: Bearer {token}
```json
{
  "title": "System Login Error",
  "description": "Users are unable to log in to the portal",
  "priorityId": 2
}
```
**Response (201):**
```json
{
  "success": true,
  "message": "Ticket created successfully",
  "data": {
    "ticketId": 45
  }
}
```

#### Get Tickets List
**GET** `/tickets`
**Headers:** Authorization: Bearer {token}
**Query Parameters:**
- `status` - Filter by status ID (1=Open, 2=In Progress, 3=Resolved, 4=Closed)
- `priority` - Filter by priority ID (1=Critical, 2=High, 3=Medium, 4=Low)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "TicketID": 45,
      "Title": "System Login Error",
      "Description": "Users unable to login",
      "CompanyID": 1,
      "PriorityID": 2,
      "PriorityName": "High",
      "StatusID": 1,
      "StatusName": "Open",
      "SLADeadline": "2023-01-16T10:30:00Z",
      "IsOverdue": 0,
      "slaCountdown": "7h 45m",
      "CreatedAt": "2023-01-15T10:30:00Z",
      "AssignedToName": "Alice Engineer"
    }
  ]
}
```

#### Get Ticket Details
**GET** `/tickets/:ticketId`
**Headers:** Authorization: Bearer {token}

**Response (200):**
```json
{
  "success": true,
  "data": {
    "TicketID": 45,
    "Title": "System Login Error",
    "Description": "Users unable to login",
    "CompanyID": 1,
    "CreatedBy": 10,
    "CreatedByName": "Client User1",
    "AssignedTo": 2,
    "AssignedToName": "Alice Engineer",
    "PriorityID": 2,
    "PriorityName": "High",
    "StatusID": 1,
    "StatusName": "Open",
    "SLADeadline": "2023-01-16T10:30:00Z",
    "IsOverdue": 0,
    "slaCountdown": "7h 45m",
    "slaDeadlineFormatted": "Jan 16, 2023, 10:30 AM",
    "CreatedAt": "2023-01-15T10:30:00Z",
    "UpdatedAt": "2023-01-15T11:00:00Z",
    "comments": [
      {
        "CommentID": 1,
        "TicketID": 45,
        "UserID": 2,
        "UserName": "Alice Engineer",
        "CommentText": "Working on this issue",
        "IsInternal": 0,
        "CreatedAt": "2023-01-15T11:00:00Z"
      }
    ],
    "attachments": [
      {
        "AttachmentID": 1,
        "TicketID": 45,
        "FileName": "error_screenshot.png",
        "FilePath": "/uploads/error_screenshot.png",
        "CreatedAt": "2023-01-15T10:35:00Z"
      }
    ]
  }
}
```

#### Get Overdue Tickets
**GET** `/tickets/overdue`
**Headers:** Authorization: Bearer {token}
**Role Required:** Manager

**Response (200):**
```json
{
  "success": true,
  "data": [...]
}
```

#### Update Ticket Status
**PUT** `/tickets/:ticketId/status`
**Headers:** Authorization: Bearer {token}
**Role Required:** Engineer, Manager

```json
{
  "statusId": 2
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket status updated successfully"
}
```

#### Assign Ticket to Engineer
**PUT** `/tickets/:ticketId/assign`
**Headers:** Authorization: Bearer {token}
**Role Required:** Manager

```json
{
  "engineerId": 5
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Ticket assigned successfully"
}
```

#### Add Comment to Ticket
**POST** `/tickets/:ticketId/comments`
**Headers:** Authorization: Bearer {token}

```json
{
  "commentText": "We are investigating the issue",
  "isInternal": false
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment added successfully"
}
```

---

### 3. USERS

#### Get All Users in Company
**GET** `/users`
**Headers:** Authorization: Bearer {token}

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "UserID": 1,
      "Name": "John Admin",
      "Email": "john.admin@techcorp.com",
      "CompanyID": 1,
      "Role": "Manager",
      "CreatedAt": "2023-01-10T10:00:00Z"
    }
  ]
}
```

#### Get Engineers in Company
**GET** `/users/engineers`
**Headers:** Authorization: Bearer {token}

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "UserID": 2,
      "Name": "Alice Engineer",
      "Email": "alice@techcorp.com",
      "CompanyID": 1,
      "Role": "Engineer",
      "CreatedAt": "2023-01-10T10:00:00Z"
    }
  ]
}
```

#### Update User Profile
**PUT** `/users/profile`
**Headers:** Authorization: Bearer {token}

```json
{
  "name": "John Updated",
  "email": "john.updated@company.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

---

### 4. COMPANIES

#### Get Current Company Details
**GET** `/companies/me`
**Headers:** Authorization: Bearer {token}

**Response (200):**
```json
{
  "success": true,
  "data": {
    "CompanyID": 1,
    "Name": "TechCorp Inc",
    "Email": "contact@techcorp.com",
    "Status": "Active",
    "CreatedAt": "2023-01-01T00:00:00Z"
  }
}
```

#### Get All Companies (Admin Only)
**GET** `/companies`
**Headers:** Authorization: Bearer {token}
**Role Required:** Manager

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "CompanyID": 1,
      "Name": "TechCorp Inc",
      "Email": "contact@techcorp.com",
      "Status": "Active"
    }
  ]
}
```

#### Create Company (Admin Only)
**POST** `/companies`
**Headers:** Authorization: Bearer {token}
**Role Required:** Manager

```json
{
  "name": "New Company Ltd",
  "email": "contact@newcompany.com"
}
```

#### Update Company (Admin Only)
**PUT** `/companies/:companyId`
**Headers:** Authorization: Bearer {token}
**Role Required:** Manager

```json
{
  "name": "Updated Company Name",
  "email": "newemail@company.com",
  "status": "Active"
}
```

---

### 5. REPORTS

#### Get Dashboard Data
**GET** `/reports/dashboard`
**Headers:** Authorization: Bearer {token}

**Response (Client/Engineer):**
```json
{
  "success": true,
  "data": {
    "ticketStats": {
      "TotalTickets": 10,
      "OpenTickets": 3,
      "ClosedTickets": 5,
      "ResolvedTickets": 2,
      "OverdueTickets": 1
    },
    "slaReport": {
      "TotalTickets": 10,
      "CompletedOnTime": 7,
      "OverdueCount": 1,
      "SLAPercentage": 90.0
    },
    "byStatus": [
      { "StatusID": 1, "Name": "Open", "Count": 3 }
    ],
    "byPriority": [
      { "PriorityID": 1, "Name": "Critical", "Count": 1 }
    ]
  }
}
```

**Response (Manager):**
```json
{
  "success": true,
  "data": [
    {
      "CompanyID": 1,
      "Name": "TechCorp Inc",
      "TotalTickets": 15,
      "OpenTickets": 5,
      "ClosedTickets": 8,
      "OverdueTickets": 2
    }
  ]
}
```

#### Get SLA Compliance Report
**GET** `/reports/sla`
**Headers:** Authorization: Bearer {token}

**Response (200):**
```json
{
  "success": true,
  "data": {
    "TotalTickets": 10,
    "CompletedOnTime": 8,
    "OverdueCount": 2,
    "SLAPercentage": 80.0
  }
}
```

#### Get Performance Report (Manager Only)
**GET** `/reports/performance`
**Headers:** Authorization: Bearer {token}
**Role Required:** Manager

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "UserID": 2,
      "Name": "Alice Engineer",
      "TotalAssigned": 8,
      "Closed": 6,
      "Overdue": 1
    }
  ]
}
```

#### Get Trending Data
**GET** `/reports/trending`
**Headers:** Authorization: Bearer {token}

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "Date": "2023-01-15",
      "Count": 5
    },
    {
      "Date": "2023-01-16",
      "Count": 3
    }
  ]
}
```

---

## Error Responses

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

### 403 - Forbidden
```json
{
  "success": false,
  "message": "Access denied. Insufficient permissions."
}
```

### 404 - Not Found
```json
{
  "success": false,
  "message": "Ticket not found"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error |

---

## Rate Limiting
Currently no rate limiting is implemented. 
For production, implement rate limiting using `express-rate-limit`.

---

## CORS
CORS is enabled for localhost development.
Configure for production domains in server.js

---

## Authentication Flow

1. User logs in with email/password
2. Server returns JWT token
3. Client stores token in localStorage
4. Client includes token in Authorization header for subsequent requests
5. Server verifies token and processes request
6. Token expires after 7 days
7. User must login again after expiration
