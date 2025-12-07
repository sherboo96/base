# Setup and Installation Guide

## Prerequisites

Before setting up the User Management System, ensure you have the following installed:

### Required Software

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **.NET 8.0 SDK**
   - Download from: https://dotnet.microsoft.com/download/dotnet/8.0
   - Verify installation: `dotnet --version`

3. **SQL Server** (2019 or higher)
   - SQL Server Express is sufficient for development
   - Download from: https://www.microsoft.com/sql-server/sql-server-downloads
   - Or use SQL Server LocalDB (included with Visual Studio)

4. **Active Directory** (for LDAP authentication)
   - Required for production
   - For development, can use test users

### Optional Software

- **Visual Studio 2022** or **Visual Studio Code** (recommended IDEs)
- **SQL Server Management Studio (SSMS)** (for database management)
- **Postman** or **Insomnia** (for API testing)

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend/UMS
```

**Note**: 
- The project folder is named `UMS` (which matches the namespace), inside the `backend` directory
- The solution file is `backend.sln` located in the `backend` folder
- You can open the solution in Visual Studio by opening `backend/backend.sln`

### 2. Configure Database Connection

Edit `appsettings.json` or `appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefualtConnection": "Server=localhost;Database=IdentityDb;MultipleActiveResultSets=true;user id=sa;password=YourStrong!Passw0rd;TrustServerCertificate=True"
  }
}
```

**Update the connection string with your SQL Server details:**
- `Server`: Your SQL Server instance (e.g., `localhost`, `localhost\\SQLEXPRESS`)
- `Database`: Database name (default: `IdentityDb`)
- `user id`: SQL Server username (or use `Integrated Security=true` for Windows Auth)
- `password`: SQL Server password

### 3. Configure JWT Settings

Edit `appsettings.json`:

```json
{
  "Jwt": {
    "Key": "your-secret-key-here-minimum-32-characters",
    "Issuer": "UMS",
    "Audience": "UMSClients",
    "ExpireMinutes": 43200
  }
}
```

**Important**: Change the JWT key to a secure random string (minimum 32 characters).

### 4. Configure LDAP Settings

Edit `Program.cs` and update the domain:

```csharp
builder.Services.AddScoped(sp => new LdapAuthenticator("moil.com"));
```

Change `"moil.com"` to your Active Directory domain.

### 5. Restore Dependencies

```bash
dotnet restore
```

### 6. Apply Database Migrations

The application will automatically apply migrations on startup. Alternatively, you can run:

```bash
dotnet ef database update
```

**Note**: If you encounter migration errors, ensure:
- SQL Server is running
- Connection string is correct
- Database user has sufficient permissions

### 7. Run the Backend

```bash
dotnet run
```

Or use Visual Studio:
- Open `backend/backend.sln` in Visual Studio
- Press `F5` to run with debugging
- Press `Ctrl+F5` to run without debugging

The backend will be available at:
- **HTTPS**: `https://localhost:5001`
- **HTTP**: `http://localhost:5000`
- **Swagger**: `https://localhost:5001/swagger`

### 8. Verify Backend Setup

1. Open Swagger UI: `https://localhost:5001/swagger`
2. Check if all endpoints are listed
3. Test the login endpoint (if you have test data)

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages from `package.json`.

### 3. Configure Environment

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  baseUrl: 'https://localhost:5001/api',  // Update to your backend URL
  encryptionKey: 'MOOP@ssw0rd20242025'     // Change in production
};
```

**For production**, create `src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  baseUrl: 'https://tech.moo.gov.kw/ums/api',
  encryptionKey: 'your-production-encryption-key'
};
```

### 4. Run the Frontend

```bash
npm start
```

Or:

```bash
ng serve
```

The frontend will be available at:
- **URL**: `http://localhost:4200`
- The application will automatically reload when you change source files

### 5. Verify Frontend Setup

1. Open browser: `http://localhost:4200`
2. You should see the login page
3. Check browser console for any errors

## Initial Data Setup

### Create Initial System

1. Use Swagger UI or API client to create a system:
   - **Endpoint**: `POST /api/Systems`
   - **Body**:
     ```json
     {
       "name": "UMS",
       "code": "UMS",
       "serverIP": "localhost",
       "domain": "moil.com",
       "database": "IdentityDb",
       "loginMethod": 2,
       "isActive": true
     }
     ```
   - `loginMethod`: 1=KMNID, 2=ActiveDirectory, 3=Credentials

### Create Initial User

1. Create a user via API:
   - **Endpoint**: `POST /api/Users`
   - **Body**:
     ```json
     {
       "fullName": "Admin User",
       "email": "admin@moil.com",
       "adUsername": "admin",
       "isActive": true
     }
     ```

2. Assign system access:
   - **Endpoint**: `POST /api/UserSystems`
   - **Body**:
     ```json
     {
       "userId": 1,
       "systemId": 1,
       "accessLevel": "Admin"
     }
     ```

### Create Initial Permissions

Create permissions for the system:

- **Endpoint**: `POST /api/Permissions`
- **Example Permissions**:
  ```json
  [
    { "name": "Organization Management", "code": "UMS0000", "systemId": 1 },
    { "name": "Department Management", "code": "UMS0001", "systemId": 1 },
    { "name": "Position Management", "code": "UMS0010", "systemId": 1 },
    { "name": "User Management", "code": "UMS0011", "systemId": 1 },
    { "name": "System Management", "code": "UMS0110", "systemId": 1 },
    { "name": "Permission Management", "code": "UMS0100", "systemId": 1 },
    { "name": "Role Management", "code": "UMS0101", "systemId": 1 },
    { "name": "User System Management", "code": "UMS1000", "systemId": 1 },
    { "name": "Role Permission Management", "code": "UMS1001", "systemId": 1 },
    { "name": "Role System Management", "code": "UMS1010", "systemId": 1 },
    { "name": "User Role Management", "code": "UMS0111", "systemId": 1 }
  ]
  ```

## Development Mode

### Backend Development Mode

In development mode:
- Swagger UI is enabled
- CORS allows all origins
- Test users (username starting with "Test") bypass AD authentication
- Detailed error messages are shown

### Frontend Development Mode

- Hot module replacement (HMR) enabled
- Source maps for debugging
- Detailed error messages in console

## Production Setup

### Backend Production Configuration

1. **Update `appsettings.Production.json`**:
   ```json
   {
     "ConnectionStrings": {
       "DefualtConnection": "your-production-connection-string"
     },
     "Jwt": {
       "Key": "your-secure-production-key",
       "Issuer": "UMS",
       "Audience": "UMSClients",
       "ExpireMinutes": 43200
     }
   }
   ```

2. **Configure CORS** in `Program.cs`:
   ```csharp
   builder.Services.AddCors(options =>
   {
       options.AddPolicy("Production",
           builder =>
           {
               builder.WithOrigins("https://your-frontend-domain.com")
                      .AllowAnyMethod()
                      .AllowAnyHeader();
           });
   });
   ```

3. **Publish the application**:
   ```bash
   dotnet publish -c Release -o ./publish
   ```

### Frontend Production Build

1. **Build for production**:
   ```bash
   npm run build -- --configuration production
   ```

2. **Output directory**: `dist/`

3. **Deploy** the `dist/` folder to your web server (IIS, Nginx, Apache, etc.)

## Troubleshooting

### Backend Issues

**Issue**: Database connection failed
- **Solution**: Check SQL Server is running and connection string is correct

**Issue**: Migration errors
- **Solution**: Ensure database user has `db_owner` or sufficient permissions

**Issue**: LDAP authentication not working
- **Solution**: Verify domain name and network connectivity to AD

**Issue**: JWT token invalid
- **Solution**: Check JWT key in `appsettings.json` matches

### Frontend Issues

**Issue**: Cannot connect to backend
- **Solution**: Check `baseUrl` in `environment.ts` and CORS settings

**Issue**: npm install fails
- **Solution**: Clear npm cache: `npm cache clean --force`

**Issue**: Build errors
- **Solution**: Delete `node_modules` and `package-lock.json`, then reinstall

### Common Issues

**Issue**: Port already in use
- **Solution**: Change ports in `launchSettings.json` (backend) or `angular.json` (frontend)

**Issue**: CORS errors
- **Solution**: Configure CORS in backend `Program.cs`

**Issue**: 401 Unauthorized
- **Solution**: Check JWT token is valid and not expired

## Next Steps

After successful setup:

1. Create initial data (System, User, Permissions)
2. Test login functionality
3. Configure additional systems
4. Set up user roles and permissions
5. Review security settings
6. Set up monitoring and logging

## Support

For issues or questions:
- Check the [README.md](./README.md) for overview
- Review [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [API.md](./API.md) for API documentation
- Contact the development team

