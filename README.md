# JSW Backend

Express and MSSQL backend for JSW reporting, authentication, user management, and sidebar access control.

## Setup

Install dependencies:

```powershell
npm install
```

Create/update `.env`:

```txt
PORT=5000
JWT_SECRET=supersecret
SUPERADMIN_SETUP_KEY=change-this-superadmin-setup-key
NODE_ENV=dev

DB_USER=sa
DB_PASSWORD=your-password
DB_SERVER=your-sql-server
DB_NAME=DB_Reporting_JSW
DB_PORT=1433
```

The database named in `DB_NAME` must already exist. The backend creates the required tables automatically inside that database.

Run the backend:

```powershell
npm run dev
```

Health check:

```txt
GET http://localhost:5000/health
```

## Database Tables

The backend creates and syncs these tables on startup:

```txt
dbo.Users
dbo.SidebarPages
dbo.UserPageAccess
```

`SidebarPages` is the master list of available sidebar sections. `UserPageAccess` stores which normal users can see which pages.

## Roles

```txt
superadmin -> full access + user management
admin      -> full access + access configuration
user       -> only assigned sidebar pages
```

The first superadmin is created through the one-time setup API. After a superadmin exists, that setup endpoint is blocked.

## Initial Flow

1. Start the backend.
2. Start the frontend.
3. Open the frontend setup page: `http://127.0.0.1:5173/setup/superadmin`.
4. Create the first superadmin using `SUPERADMIN_SETUP_KEY`.
5. Login as superadmin.
6. Create admin/user accounts from User Management.
7. Assign sidebar access to normal users from Access Configuration.

## API Endpoints

Setup:

```txt
POST /api/setup/superadmin
```

Auth:

```txt
POST /api/auth/login
GET  /api/auth/me
```

Users:

```txt
GET    /api/users
POST   /api/users
PATCH  /api/users/:userId
DELETE /api/users/:userId
```

Access:

```txt
GET /api/access/me/pages
GET /api/access/pages
GET /api/access/users/:userId/pages
PUT /api/access/users/:userId/pages
```

## Central Config

Most access constants are centralized in:

```txt
src/config/appConfig.js
```

This includes roles, role groups, JWT expiry, setup key, sidebar pages, and assignable page keys.
