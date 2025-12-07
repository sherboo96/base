# Architecture Documentation

## System Architecture Overview

The User Management System follows a **clean architecture** pattern with clear separation between the frontend (Angular) and backend (ASP.NET Core) layers.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Components  │  │   Services   │  │   Guards     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Interceptors │  │    Models    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST API
                            │ (JWT Authentication)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Controllers  │  │   Services   │  │  Repository   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │     DTOs     │  │    Models    │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Entity Framework Core
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
│                    SQL Server Database                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ LDAP Protocol
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Active Directory (LDAP)                     │
└─────────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Component Structure

The frontend follows Angular's component-based architecture:

```
app/
├── components/          # Reusable UI components
│   ├── generic/        # Generic table, modal, pagination
│   ├── loading/        # Loading indicator
│   ├── nav-bar/        # Navigation bar
│   ├── side-menu/      # Side navigation menu
│   └── searchable-select/  # Searchable dropdown
│
├── pages/              # Feature pages
│   ├── dashboard/     # Dashboard page
│   ├── login/          # Login page
│   ├── management/     # Management modules
│   │   ├── user/       # User management
│   │   ├── role/       # Role management
│   │   ├── permission/ # Permission management
│   │   └── ...
│   └── profile/        # User profile
│
├── services/           # Business logic and API calls
│   ├── api.service.ts      # Base API service
│   ├── auth.service.ts     # Authentication service
│   ├── user.service.ts     # User management service
│   └── ...
│
├── guards/             # Route guards
│   └── permission.guard.ts  # Permission-based guard
│
└── interceptors/      # HTTP interceptors
    ├── auth.interceptor.ts  # JWT token injection
    └── loading.interceptor.ts  # Loading state management
```

### Key Design Patterns

1. **Service Pattern**: Business logic encapsulated in services
2. **Guard Pattern**: Route protection with AuthGuard and PermissionGuard
3. **Interceptor Pattern**: Cross-cutting concerns (auth, loading)
4. **Component Pattern**: Reusable, modular components
5. **Observable Pattern**: RxJS for async data handling

### State Management

- **Local State**: Component-level state using Angular's reactive forms
- **Shared State**: Services with BehaviorSubject for user authentication state
- **Storage**: LocalStorage for token and user data persistence

## Backend Architecture

### Layered Architecture

```
┌─────────────────────────────────────┐
│         Controllers Layer            │  ← API Endpoints
│  (HTTP Request/Response Handling)    │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│          Services Layer               │  ← Business Logic
│  (Authentication, Token Generation)  │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│        Repository Layer               │  ← Data Access
│  (Unit of Work Pattern)              │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│         Data Access Layer            │  ← Entity Framework
│  (DbContext, Migrations)             │
└─────────────────────────────────────┘
```

### Repository Pattern

The backend uses the **Repository Pattern** with **Unit of Work**:

- **IBaseRepository<T, TViewModel>**: Generic repository interface
- **BaseRepository<T, TViewModel>**: Generic repository implementation
- **IUnitOfWork**: Unit of Work interface managing all repositories
- **UnitOfWork**: Unit of Work implementation

**Benefits**:
- Separation of data access logic
- Testability
- Centralized data access
- Transaction management

### Data Flow

1. **Request** → Controller receives HTTP request
2. **Validation** → DTO validation (if needed)
3. **Business Logic** → Service layer processes request
4. **Data Access** → Repository accesses database via Unit of Work
5. **Response** → Controller returns DTO response

## Authentication & Authorization

### Authentication Flow

```
User Login
    │
    ▼
Frontend sends credentials
    │
    ▼
Backend validates (LDAP/AD)
    │
    ▼
JWT Token generated
    │
    ▼
Token stored in localStorage
    │
    ▼
Token included in subsequent requests
```

### Authorization Levels

1. **Route Level**: Angular guards protect routes
2. **Component Level**: Permission checks in components
3. **API Level**: Backend validates permissions
4. **Permission Codes**: Unique permission codes (e.g., UMS0000, UMS0001)

### Permission System

- **Permissions**: Granular permissions per system
- **Roles**: Collections of permissions
- **User Roles**: Users assigned to roles
- **Role Permissions**: Permissions assigned to roles
- **User Systems**: Direct system access for users

## Database Architecture

### Entity Relationships

```
Organization
    │
    └─── Department
            │
            └─── DepartmentUser ─── User
                                      │
                                      ├─── UserRole ─── Role
                                      │                    │
                                      │                    ├─── RolePermission ─── Permission
                                      │                    │
                                      │                    └─── RoleSystem ─── System
                                      │
                                      └─── UserSystem ─── System
```

### Key Entities

- **User**: Core user entity with AD integration
- **Role**: Role definitions
- **Permission**: Permission definitions per system
- **System**: System/application definitions
- **Organization**: Organizational hierarchy
- **Department**: Department structure
- **JobTitle**: Position/job title definitions

### Join Tables

- **UserRole**: Many-to-many (User ↔ Role)
- **RolePermission**: Many-to-many (Role ↔ Permission)
- **RoleSystem**: Many-to-many (Role ↔ System)
- **UserSystem**: Many-to-many (User ↔ System)
- **DepartmentUser**: Many-to-many (Department ↔ User)
- **StructureUser**: Many-to-many (Structure ↔ User)

## Security Architecture

### Authentication Methods

1. **Active Directory (LDAP)**
   - Domain: `moil.com`
   - Validates credentials against AD
   - Retrieves user information from AD

2. **KMNID**
   - Civil number-based authentication
   - Integration with KMNID service (TODO)

3. **Credentials**
   - Username/password stored in database
   - Password hashing (TODO)

### Security Features

- **JWT Tokens**: Secure token-based authentication
- **Token Expiration**: Configurable expiration (default: 43200 minutes)
- **Account Locking**: Automatic lock after failed attempts
- **HTTPS**: Enforced in production
- **CORS**: Configured for allowed origins
- **Input Validation**: DTO validation

## Integration Points

### Active Directory Integration

- **LdapAuthenticator Service**: Handles AD authentication
- **User Lookup**: Retrieves user information from AD
- **Credential Validation**: Validates username/password

### External Systems

- **System Registration**: Systems can be registered in UMS
- **System-Specific Permissions**: Permissions scoped to systems
- **Multi-System Access**: Users can access multiple systems

## Design Principles

1. **Separation of Concerns**: Clear boundaries between layers
2. **DRY (Don't Repeat Yourself)**: Reusable components and services
3. **SOLID Principles**: Applied throughout the codebase
4. **Dependency Injection**: Used extensively in both frontend and backend
5. **Async/Await**: Asynchronous operations for better performance
6. **Error Handling**: Comprehensive error handling and logging

## Scalability Considerations

- **Repository Pattern**: Easy to swap data sources
- **Unit of Work**: Efficient transaction management
- **Async Operations**: Non-blocking I/O operations
- **Caching**: Can be added at repository level
- **Load Balancing**: Stateless JWT tokens support horizontal scaling

## Future Enhancements

- [ ] Password hashing implementation
- [ ] KMNID service integration
- [ ] Caching layer
- [ ] Audit logging
- [ ] Real-time notifications
- [ ] Advanced search and filtering
- [ ] Export/Import functionality
- [ ] Multi-language support

