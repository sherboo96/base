# Database Schema Documentation

## Overview

The User Management System uses **SQL Server** as the database, managed through **Entity Framework Core 9.0**. The database follows a relational model with support for multi-system access control and organizational hierarchy.

## Database Name

- **Default**: `IdentityDb`
- **Configurable**: Via `appsettings.json` connection string

## Entity Relationships

```
Organization (1) ──── (N) Department
                              │
                              │ (N)
                              │
                              ▼
                        DepartmentUser
                              │
                              │ (N)
                              │
                              ▼
                            User (1) ──── (N) UserRole ──── (N) Role
                              │                                    │
                              │                                    │
                              │ (N)                                │ (N)
                              │                                    │
                              ▼                                    ▼
                        UserSystem                            RolePermission
                              │                                    │
                              │ (N)                                │ (N)
                              │                                    │
                              ▼                                    ▼
                           System                            Permission
                              │                                    │
                              │ (N)                                │ (1)
                              │                                    │
                              ▼                                    │
                        RoleSystem ───────────────────────────────┘
                              │
                              │ (N)
                              │
                              ▼
                            Role

User (1) ──── (N) StructureUser ──── (N) Structure
                              │
                              │ (self-referencing)
                              ▼
                         Structure (Parent/Children)
```

## Core Entities

### User

**Table**: `Users`

**Description**: Core user entity with Active Directory integration.

**Fields**:
- `Id` (int, PK): Primary key
- `FullName` (string): User's full name
- `Email` (string): Email address
- `ADUsername` (string): Active Directory username
- `CivilNo` (string, nullable): Civil number for KMNID authentication
- `JobTitleId` (int, nullable, FK): Reference to JobTitle
- `LastLogin` (datetime, nullable): Last login timestamp
- `FailedLoginAttempts` (int): Count of failed login attempts
- `IsLocked` (bool): Account lock status
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Relationships**:
- One-to-Many: `JobTitle`
- Many-to-Many: `Role` (via `UserRole`)
- Many-to-Many: `System` (via `UserSystem`)
- Many-to-Many: `Department` (via `DepartmentUser`)
- Many-to-Many: `Structure` (via `StructureUser`)

### Role

**Table**: `Roles`

**Description**: Role definitions for access control.

**Fields**:
- `Id` (int, PK): Primary key
- `Name` (string): Role name
- `SystemId` (int, nullable, FK): Optional system association
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Relationships**:
- Many-to-One: `System` (optional)
- Many-to-Many: `User` (via `UserRole`)
- Many-to-Many: `Permission` (via `RolePermission`)
- Many-to-Many: `System` (via `RoleSystem`)

### Permission

**Table**: `Permissions`

**Description**: Permission definitions scoped to systems.

**Fields**:
- `Id` (int, PK): Primary key
- `Name` (string): Permission name
- `Code` (string): Unique permission code (e.g., "UMS0000")
- `SystemId` (int, FK): System association (required)
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Relationships**:
- Many-to-One: `System` (required)
- Many-to-Many: `Role` (via `RolePermission`)

### SystemEntity

**Table**: `Systems`

**Description**: System/application definitions.

**Fields**:
- `Id` (int, PK): Primary key
- `Name` (string): System name
- `Code` (string): System code
- `ServerIP` (string): Server IP address
- `Domain` (string): Domain name
- `Database` (string): Database name
- `StartDate` (datetime, nullable): System start date
- `LoginMethod` (int): Login method enum (1: KMNID, 2: ActiveDirectory, 3: Credentials)
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Relationships**:
- One-to-Many: `Permission`
- One-to-Many: `Role` (optional)
- Many-to-Many: `User` (via `UserSystem`)
- Many-to-Many: `Role` (via `RoleSystem`)

### Organization

**Table**: `Organizations`

**Description**: Organizational units.

**Fields**:
- `Id` (int, PK): Primary key
- `Name` (string): Organization name
- `Code` (string): Organization code
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Relationships**:
- One-to-Many: `Department`

### Department

**Table**: `Departments`

**Description**: Department structure within organizations.

**Fields**:
- `Id` (int, PK): Primary key
- `Name` (string): Department name
- `Code` (string): Department code
- `OrganizationId` (int, FK): Organization association
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Relationships**:
- Many-to-One: `Organization`
- Many-to-Many: `User` (via `DepartmentUser`)

### JobTitle

**Table**: `JobTitles`

**Description**: Position/job title definitions.

**Fields**:
- `Id` (int, PK): Primary key
- `Name` (string): Job title name
- `Code` (string): Job title code
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Relationships**:
- One-to-Many: `User`

### Structure

**Table**: `Structures`

**Description**: Hierarchical structure with self-referencing.

**Fields**:
- `Id` (int, PK): Primary key
- `Name` (string): Structure name
- `Code` (string): Structure code
- `ParentId` (int, nullable, FK): Parent structure (self-reference)
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Relationships**:
- Self-referencing: `Structure` (Parent/Children)
- Many-to-Many: `User` (via `StructureUser`)

## Join Tables

### UserRole

**Table**: `UserRoles`

**Description**: Many-to-many relationship between Users and Roles.

**Fields**:
- `UserId` (int, PK, FK): User ID
- `RoleId` (int, PK, FK): Role ID

**Composite Primary Key**: (`UserId`, `RoleId`)

### RolePermission

**Table**: `RolePermissions`

**Description**: Many-to-many relationship between Roles and Permissions.

**Fields**:
- `RoleId` (int, PK, FK): Role ID
- `PermissionId` (int, PK, FK): Permission ID

**Composite Primary Key**: (`RoleId`, `PermissionId`)

### RoleSystem

**Table**: `RoleSystems`

**Description**: Many-to-many relationship between Roles and Systems.

**Fields**:
- `RoleId` (int, PK, FK): Role ID
- `SystemId` (int, PK, FK): System ID

**Composite Primary Key**: (`RoleId`, `SystemId`)

### UserSystem

**Table**: `UserSystems`

**Description**: Many-to-many relationship between Users and Systems with optional access level.

**Fields**:
- `UserId` (int, PK, FK): User ID
- `SystemId` (int, PK, FK): System ID
- `AccessLevel` (string, nullable): Access level (e.g., "Read", "Write", "Admin")
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Composite Primary Key**: (`UserId`, `SystemId`)

### DepartmentUser

**Table**: `DepartmentUsers`

**Description**: Many-to-many relationship between Departments and Users with assignment type.

**Fields**:
- `DepartmentId` (int, PK, FK): Department ID
- `UserId` (int, PK, FK): User ID
- `AssignmentType` (string): Assignment type (e.g., "Primary", "Secondary")
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Composite Primary Key**: (`DepartmentId`, `UserId`)

### StructureUser

**Table**: `StructureUsers`

**Description**: Many-to-many relationship between Structures and Users.

**Fields**:
- `StructureId` (int, PK, FK): Structure ID
- `UserId` (int, PK, FK): User ID
- `IsActive` (bool): Active status
- `CreatedAt` (datetime): Creation timestamp
- `CreatedBy` (string): Creator identifier
- `UpdatedAt` (datetime, nullable): Last update timestamp
- `UpdatedBy` (string, nullable): Last updater identifier

**Composite Primary Key**: (`StructureId`, `UserId`)

## Base Model

All entities (except join tables) inherit from `BaseModel`:

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

## Indexes

Entity Framework Core automatically creates indexes for:
- Primary keys
- Foreign keys
- Unique constraints

Consider adding indexes for:
- `Users.Email` (for login lookups)
- `Users.ADUsername` (for AD authentication)
- `Permissions.Code` (for permission checks)
- `Systems.Code` (for system lookups)

## Migrations

Database migrations are managed through Entity Framework Core:

```bash
# Create migration
dotnet ef migrations add MigrationName

# Apply migrations
dotnet ef database update

# Rollback migration
dotnet ef database update PreviousMigrationName
```

Migrations are automatically applied on application startup in `Program.cs`.

## Data Seeding

Consider implementing data seeding for:
- Default system
- Default roles
- Default permissions
- Admin user

## Constraints

### Foreign Key Constraints

- All foreign keys have cascade delete where appropriate
- `Structure.ParentId` has `Restrict` delete to prevent orphaned structures

### Unique Constraints

- `Permissions.Code` should be unique per system
- `Systems.Code` should be unique
- `Users.Email` should be unique
- `Users.ADUsername` should be unique

## Performance Considerations

1. **Pagination**: Use pagination for large datasets
2. **Eager Loading**: Use `Include()` for related entities when needed
3. **AsNoTracking**: Use `AsNoTracking()` for read-only queries
4. **Indexes**: Add indexes for frequently queried fields
5. **Connection Pooling**: Configured via connection string

## Backup and Recovery

- Regular database backups recommended
- Transaction log backups for point-in-time recovery
- Consider Azure SQL Database or SQL Server Always On for high availability

## Security

- Use parameterized queries (handled by EF Core)
- Encrypt sensitive data at rest
- Use SQL Server authentication or Windows Authentication
- Implement row-level security if needed
- Regular security updates

