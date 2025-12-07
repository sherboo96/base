# Backend Documentation

## Overview

The backend is built with **ASP.NET Core 8.0** and follows a clean architecture pattern with Repository and Unit of Work patterns for data access.

## Technology Stack

- **Framework**: ASP.NET Core 8.0
- **ORM**: Entity Framework Core 9.0
- **Database**: SQL Server
- **Authentication**: JWT Bearer Tokens
- **Directory Services**: System.DirectoryServices (LDAP)
- **Mapping**: AutoMapper 14.0
- **API Documentation**: Swashbuckle (Swagger)

## Project Structure

The backend project is located at `backend/UMS/`:

```
backend/UMS/
├── Controllers/          # API Controllers
│   ├── AuthenticationsController.cs
│   ├── UsersController.cs
│   ├── RolesController.cs
│   ├── PermissionsController.cs
│   ├── SystemsController.cs
│   ├── OrganizationsController.cs
│   ├── DepartmentsController.cs
│   ├── JobTitlesController.cs
│   ├── UserRolesController.cs
│   ├── RolePermissionsController.cs
│   ├── RoleSystemsController.cs
│   ├── UserSystemsController.cs
│   └── StructuresController.cs
│
├── Models/              # Entity Models
│   ├── User.cs
│   ├── Role.cs
│   ├── Permission.cs
│   ├── SystemEntity.cs
│   ├── Organization.cs
│   ├── Department.cs
│   ├── JobTitle.cs
│   ├── Structure.cs
│   ├── UserRole.cs
│   ├── RolePermission.cs
│   ├── RoleSystem.cs
│   ├── UserSystem.cs
│   ├── DepartmentUser.cs
│   ├── StructureUser.cs
│   └── Shared/
│       ├── BaseModel.cs
│       └── AdUserModel.cs
│
├── Dtos/                # Data Transfer Objects
│   ├── UserDto.cs
│   ├── RoleDto.cs
│   ├── PermissionDto.cs
│   ├── SystemDto.cs
│   ├── OrganizationDto.cs
│   ├── DepartmentDto.cs
│   ├── JobTitleDto.cs
│   ├── StructureDto.cs
│   ├── UserRoleDto.cs
│   ├── RolePermissionDto.cs
│   ├── RoleSystemDto.cs
│   ├── UserSystemDto.cs
│   ├── DepartmentUserDto.cs
│   ├── StructureUserDto.cs
│   ├── Authentication/
│   │   └── LoginRequest.cs
│   └── Shared/
│       └── BaseResponse.cs
│
├── Services/            # Business Logic Services
│   ├── JwtTokenGenerator.cs
│   └── LdapAuthenticator.cs
│
├── Repository/          # Data Access Layer
│   ├── BaseRepository.cs
│   └── UnitOfWork.cs
│
├── Interfaces/          # Repository Interfaces
│   ├── IBaseRepository.cs
│   └── IUnitOfWork.cs
│
├── Data/                # Database Context
│   ├── ApplicationDbContext.cs
│   ├── Mapping.cs (AutoMapper profiles)
│   └── Migrations/      # EF Core Migrations
│
├── Program.cs           # Application entry point
├── appsettings.json    # Configuration
└── UMS.csproj          # Project file
└── backend.sln         # Solution file
```

## Core Components

### Controllers

All controllers follow RESTful conventions and return `BaseResponse<T>` for consistent API responses.

#### AuthenticationsController

Handles user authentication with multiple login methods:

- **Endpoint**: `POST /api/Authentications/login`
- **Login Methods**:
  - Active Directory (LDAP)
  - KMNID (Civil Number)
  - Credentials (Username/Password)
- **Response**: JWT token and user information

#### UsersController

User management operations:

- `GET /api/Users` - Get all users (paginated)
- `GET /api/Users/{id}` - Get user by ID
- `POST /api/Users` - Create new user
- `PUT /api/Users/{id}` - Update user
- `DELETE /api/Users/{id}` - Delete user

#### RolesController

Role management:

- `GET /api/Roles` - Get all roles
- `GET /api/Roles/{id}` - Get role by ID
- `POST /api/Roles` - Create role
- `PUT /api/Roles/{id}` - Update role
- `DELETE /api/Roles/{id}` - Delete role

#### PermissionsController

Permission management:

- `GET /api/Permissions` - Get all permissions
- `GET /api/Permissions/{id}` - Get permission by ID
- `POST /api/Permissions` - Create permission
- `PUT /api/Permissions/{id}` - Update permission
- `DELETE /api/Permissions/{id}` - Delete permission

#### SystemsController

System management:

- `GET /api/Systems` - Get all systems
- `GET /api/Systems/{id}` - Get system by ID
- `POST /api/Systems` - Create system
- `PUT /api/Systems/{id}` - Update system
- `DELETE /api/Systems/{id}` - Delete system

### Repository Pattern

#### IBaseRepository<T, TViewModel>

Generic repository interface providing CRUD operations:

```csharp
Task<T> AddAsync(TViewModel viewModel);
Task<T> FindAsync(Expression<Func<T, bool>> match, string[] includes = null);
Task<IEnumerable<T>> GetAllAsync(string[] includes = null);
Task<T> UpdateAsync(T entity);
Task<bool> DeleteAsync(int id);
Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
```

#### IUnitOfWork

Manages all repositories and provides transaction support:

```csharp
IBaseRepository<User, UserDto> Users { get; }
IBaseRepository<Role, RoleDto> Roles { get; }
// ... other repositories
int Complete();
Task<int> CompleteAsync();
```

### Services

#### JwtTokenGenerator

Generates JWT tokens for authenticated users:

- **Claims**: User ID, Full Name, System Code, Department ID, Organization Code
- **Expiration**: Configurable (default: 43200 minutes)
- **Algorithm**: HS256

#### LdapAuthenticator

Handles Active Directory authentication:

- **Domain**: `moil.com`
- **Methods**:
  - `ValidateCredentials(username, password)` - Validates AD credentials
  - `GetUserFromDomain(username)` - Retrieves user from AD
  - `GetFullName(username)` - Gets user's display name
  - `IsUsernameInDomain(username)` - Checks if user exists in domain

### Models

#### BaseModel

All entities inherit from `BaseModel`:

```csharp
public class BaseModel
{
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}
```

#### Key Entities

- **User**: User information with AD integration
- **Role**: Role definitions
- **Permission**: Permission definitions (scoped to systems)
- **SystemEntity**: System/application definitions
- **Organization**: Organizational units
- **Department**: Department structure
- **JobTitle**: Position/job title

### Data Transfer Objects (DTOs)

DTOs are used for API communication and are mapped to/from entities using AutoMapper.

#### BaseResponse<T>

Standard API response wrapper:

```csharp
public class BaseResponse<T>
{
    public int StatusCode { get; set; }
    public string Message { get; set; }
    public T Result { get; set; }
}
```

## Configuration

### appsettings.json

```json
{
  "ConnectionStrings": {
    "DefualtConnection": "Server=localhost;Database=IdentityDb;..."
  },
  "Jwt": {
    "Key": "your-secret-key",
    "Issuer": "UMS",
    "Audience": "UMSClients",
    "ExpireMinutes": 43200
  }
}
```

### Program.cs Configuration

- **CORS**: Configured to allow all origins (development)
- **Authentication**: JWT Bearer authentication
- **Swagger**: Enabled in development
- **AutoMapper**: Configured with mapping profiles
- **Database**: SQL Server with automatic migrations

## Database Context

### ApplicationDbContext

Entity Framework Core DbContext managing all entities:

- **Organizations**: Organization entities
- **Departments**: Department entities
- **Users**: User entities
- **Roles**: Role entities
- **Permissions**: Permission entities
- **Systems**: System entities
- **Join Tables**: UserRole, RolePermission, RoleSystem, UserSystem, etc.

### Migrations

Entity Framework Core migrations are automatically applied on startup:

```csharp
db.Database.Migrate();
```

## Authentication Flow

1. **Login Request**: User sends credentials to `/api/Authentications/login`
2. **System Validation**: System is validated
3. **Authentication Method**: Based on system's LoginMethod:
   - **Active Directory**: Validates via LDAP
   - **KMNID**: Validates via Civil Number
   - **Credentials**: Validates against database
4. **User Validation**: Checks if user exists and is active
5. **System Access**: Validates user has access to requested system
6. **Token Generation**: JWT token generated with user claims
7. **Response**: Returns token and user information

## Authorization

Authorization is handled at the API level. Controllers can use:

- `[Authorize]` attribute for authenticated endpoints
- Permission checks in business logic
- Role-based access control

## API Response Format

All API responses follow this format:

```json
{
  "statusCode": 200,
  "message": "Success message",
  "result": { /* data */ }
}
```

### Status Codes

- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

## Error Handling

Errors are caught and returned as `BaseResponse` with appropriate status codes:

```csharp
return NotFound(new BaseResponse<bool> 
{ 
    StatusCode = 404, 
    Message = "User not found.", 
    Result = false 
});
```

## Development Mode

In development mode:

- Authentication bypass for testing (if username starts with "Test")
- Swagger UI enabled
- Detailed error messages
- CORS allows all origins

## Testing

### Swagger UI

Access Swagger documentation at:
- Development: `https://localhost:5001/swagger`

### HTTP File

A `UMS.http` file is included for testing API endpoints.

## Best Practices

1. **Repository Pattern**: All data access through repositories
2. **Unit of Work**: Transaction management via UnitOfWork
3. **DTOs**: Use DTOs for API communication
4. **AutoMapper**: Entity-DTO mapping
5. **Async/Await**: All database operations are async
6. **Error Handling**: Consistent error responses
7. **Validation**: Input validation in controllers
8. **Security**: JWT tokens, HTTPS, account locking

## Future Enhancements

- [ ] Password hashing for credential-based authentication
- [ ] KMNID service integration
- [ ] Audit logging
- [ ] Caching layer
- [ ] API versioning
- [ ] Rate limiting
- [ ] Request/Response logging
- [ ] Health checks

