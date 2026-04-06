# Setup Guide
## Multi-Company Internal Ticketing System

---

## System Requirements

- **Node.js:** v14.0 or higher
- **npm:** v6.0 or higher
- **SQL Server:** 2019 or later (or SQL Server 2022)
- **Git:** Latest version
- **RAM:** 4GB minimum
- **Disk Space:** 2GB minimum

### Recommended
- Windows 10/11 or Linux/Mac with WSL
- Visual Studio Code or similar IDE
- SQL Server Management Studio (SSMS)
- Postman (for API testing)

---

## Step-by-Step Setup

### Phase 1: Database Setup

#### 1.1 Create SQL Server Database

1. **Open SQL Server Management Studio**

2. **Create new database:**
   - Right-click "Databases" → New Database
   - Name: `TicketingSystem`
   - Click OK

3. **Execute schema script:**
   - Open new query window
   - Open `database/schema.sql` file
   - Execute (F5)
   - Verify table creation (expand Tables in Object Explorer)

#### 1.2 Verify Database

Run this query to verify all tables:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = 'dbo'
```

Should return:
- Companies
- Users
- Tickets
- TicketComments
- Priority
- Status
- Attachments
- AuditLogs

#### 1.3 Update Sample Passwords (Optional)

To use demo accounts, hash some passwords:
```sql
-- Use this in your Node.js backend to hash password
-- Then update the Users table

UPDATE Users SET PasswordHash = 'HASHED_PASSWORD_HERE' 
WHERE Email = 'client1@techcorp.com'
```

Or create new users after backend is running via registration endpoint.

---

### Phase 2: Backend Setup

#### 2.1 Navigate and Install

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

#### 2.2 Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings
# Windows: notepad .env
# Mac/Linux: nano .env
```

Update the following values:
```
DB_SERVER=localhost                 # Your SQL Server address
DB_DATABASE=TicketingSystem          # Database name you created
DB_USER=sa                          # SQL Server username
DB_PASSWORD=YourPassword123         # SQL Server password
DB_PORT=1433                        # Default SQL Server port
JWT_SECRET=your_super_secret_key    # Change this to something random
PORT=5000                           # Backend server port
NODE_ENV=development                # Environment
```

**Example for local development:**
```
DB_SERVER=localhost
DB_DATABASE=TicketingSystem
DB_USER=sa
DB_PASSWORD=MyPassword123!
DB_PORT=1433
JWT_SECRET=mysupersecretkey12345
PORT=5000
NODE_ENV=development
```

#### 2.3 Run Backend

```bash
# Production start
npm start

# Development (with auto-reload)
npm run dev
```

Expected output:
```
✓ Server running on port 5000
✓ Environment: development
✓ Database: TicketingSystem
✓ Database connected successfully
✓ SLA monitoring job started
```

#### 2.4 Test Backend

```bash
# In another terminal, test the server
curl http://localhost:5000/api/health
```

Expected response:
```json
{ "status": "Server is running" }
```

---

### Phase 3: Frontend Setup

#### 3.1 Navigate and Install

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

#### 3.2 Environment Configuration

```bash
# Copy example env file
cp .env.example .env

# Edit if needed (usually defaults work for local dev)
```

Frontend `.env` should be:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

#### 3.3 Run Frontend

```bash
# Start development server
npm start
```

The app should automatically open in your browser at `http://localhost:3000`

Expected startup:
- React starts compiling
- Browser opens automatically
- You see Login page

#### 3.4 Test Frontend

Try logging in with demo credentials (you may need to update DB passwords first):
- Email: `client1@techcorp.com`
- Password: (update in database first)

---

## Post-Installation

### 1. Create Test Users

After backend is running, you can register new users:

```bash
# POST request to register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Engineer",
    "email": "engineer@techcorp.com",
    "password": "TestPass123!",
    "companyId": 1,
    "role": "Engineer"
  }'
```

### 2. Test API with Postman

1. Open Postman
2. Create collection "Ticket System API"
3. Add requests:

**Login Request:**
```
POST: http://localhost:5000/api/auth/login
Body (JSON):
{
  "email": "client1@techcorp.com",
  "password": "your_password"
}
```

**Get Tickets Request:**
```
GET: http://localhost:5000/api/tickets
Headers:
- Authorization: Bearer <token_from_login>
```

### 3. Verify All Features

- [ ] Login/Logout works
- [ ] Can view dashboard
- [ ] Can view ticket list
- [ ] Can create ticket (Client/Engineer role)
- [ ] Can view ticket details
- [ ] Can add comments
- [ ] Can update status (Engineer role)
- [ ] Can assign tickets (Manager role)
- [ ] Reports load correctly

---

## Common Issues & Solutions

### Issue 1: Cannot Connect to Database

**Symptoms:** 
```
Error: Database connection error: Login failed
```

**Solutions:**
1. Verify SQL Server is running:
   ```bash
   # Windows: Check Services
   # Press Windows + R, type services.msc
   # Look for "SQL Server (MSSQLSERVER)"
   ```

2. Verify credentials in .env file:
   ```bash
   # Test connection string
   # Use SSMS to test
   ```

3. Check firewall:
   ```bash
   # SQL Server must be accessible on port 1433
   # Disable firewall temporarily to test
   ```

### Issue 2: npm install Fails

**Symptoms:**
```
npm ERR! code ERESOLVE
npm ERR! unable to resolve dependency tree
```

**Solutions:**
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install

# If still fails, use legacy peer deps
npm install --legacy-peer-deps
```

### Issue 3: Port Already in Use

**Symptoms:**
```
Error: listen EADDRINUSE :::5000
```

**Solutions:**
```bash
# Kill process using port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process using port 5000 (Mac/Linux)
lsof -ti:5000 | xargs kill -9

# Or change port in .env
PORT=5001
```

### Issue 4: Frontend Cannot Reach Backend

**Symptoms:**
```
CORS error or Failed to fetch
```

**Solutions:**
1. Verify backend is running:
   ```bash
   curl http://localhost:5000/api/health
   ```

2. Check REACT_APP_API_URL in frontend/.env:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

3. Clear browser cache:
   - DevTools → Application → Clear Storage

### Issue 5: Login Always Fails

**Symptoms:**
```
Invalid email or password
```

**Solutions:**
1. Verify user exists in database:
   ```sql
   SELECT * FROM Users WHERE Email = 'your_email@company.com'
   ```

2. Create test user via API:
   ```bash
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@techcorp.com",
       "password": "TestPass123!",
       "companyId": 1,
       "role": "Client"
     }'
   ```

3. Use simple password for testing:
   - Min 1 character (validation is minimal intentionally)

### Issue 6: Tables Not Created

**Symptoms:**
```
Cannot find table 'Tickets' in database
```

**Solutions:**
1. Verify schema.sql executed:
   ```sql
   SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_SCHEMA = 'dbo'
   -- Should return 8
   ```

2. Re-run schema:
   - Open database/schema.sql
   - Execute entire script
   - Verify from Messages tab

---

## File Structure Quick Reference

```
Ticket/
├── backend/           ← Node.js/Express server (PORT 5000)
│   ├── controllers/   ← Request handlers
│   ├── routes/        ← API routes
│   ├── services/      ← Business logic
│   ├── middleware/    ← Auth, validation
│   ├── config/        ← Database config
│   ├── utils/         ← Helper functions
│   ├── jobs/          ← Scheduled tasks
│   ├── server.js      ← Main server file
│   └── package.json
│
├── frontend/          ← React app (PORT 3000)
│   ├── src/
│   │   ├── components/← Reusable components
│   │   ├── pages/     ← Page components
│   │   ├── services/  ← API calls
│   │   ├── context/   ← React Context
│   │   ├── hooks/     ← Custom hooks
│   │   ├── styles/    ← CSS files
│   │   ├── App.js     ← Main App component
│   │   └── index.js   ← React entry point
│   ├── public/        ← HTML template
│   └── package.json
│
├── database/
│   └── schema.sql     ← Database tables
│
└── docs/
    ├── README.md      ← Main documentation
    ├── API.md         ← API reference
    └── SETUP.md       ← This file
```

---

## Running the Full Application

### Terminal 1: Backend
```bash
cd backend
npm start
# Runs on http://localhost:5000
```

### Terminal 2: Frontend
```bash
cd frontend
npm start
# Opens http://localhost:3000 automatically
```

### Terminal 3: Monitoring (Optional)
```bash
# Monitor database or logs
# or use SQL Server Profiler
```

---

## Next Steps

1. **Explore the application**
   - Create tickets
   - Assign to engineers
   - Add comments
   - View reports

2. **Test all features**
   - Test each user role
   - Verify SLA countdown
   - Check role-based access

3. **Customize for production**
   - Update styling/branding
   - Configure email notifications
   - Set up proper authentication
   - Configure HTTPS

4. **Deploy to cloud**
   - Backend: Heroku, Azure, AWS
   - Frontend: Vercel, Netlify, GitHub Pages
   - Database: Azure SQL, AWS RDS, etc.

---

## Useful Commands

```bash
# Backend
npm install              # Install dependencies
npm start                # Start server
npm run dev              # Start with nodemon auto-reload

# Frontend
npm install              # Install dependencies
npm start                # Start dev server
npm build                # Build for production
npm test                 # Run tests

# Database
sqlcmd -S localhost -U sa -P password    # Connect to SQL Server
# In sqlcmd:
# > USE TicketingSystem
# > SELECT * FROM Companies
# > GO
```

---

## Troubleshooting Resources

- SQL Server Connection Issues: Check .env credentials
- React Errors: Check browser console (F12)
- Network Errors: Verify ports (5000, 3000) are available
- Database Issues: Use SSMS to verify tables

---

## Support

If you encounter issues:
1. Check error messages carefully
2. Review logs in terminal
3. Check browser console (F12)
4. Verify all prerequisites are installed
5. Ensure database is set up correctly

---

**Last Updated:** March 2026
