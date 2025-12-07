# API Documentation

## Base URL

- **Development**: `https://tech.moo.gov.kw/ums/api`
- **Local**: `https://localhost:5001/api`

## Authentication

All protected endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Login

**Endpoint**: `POST /api/Authentications/login`

**Request Body**:
```json
{
  "username": "user@moil.com",
  "password": "password",
  "system": 1
}
```

**Response**:
```json
{
  "statusCode": 200,
  "message": "Login successful.",
  "result": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "fullName": "John Doe",
      "email": "john.doe@moil.com",
      "adUsername": "john.doe"
    },
    "roles": [...]
  }
}
```

## Response Format

All API responses follow this structure:

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

## Endpoints

### Users

#### Get All Users
- **Endpoint**: `GET /api/Users`
- **Query Parameters**:
  - `take` (optional): Number of records to return
  - `skip` (optional): Number of records to skip
  - `orderBy` (optional): Field to order by
  - `orderByDirection` (optional): `Ascending` or `Descending`
- **Response**: Array of UserDto objects

#### Get User by ID
- **Endpoint**: `GET /api/Users/{id}`
- **Response**: UserDto object

#### Create User
- **Endpoint**: `POST /api/Users`
- **Request Body**: UserDto
- **Response**: Created UserDto

#### Update User
- **Endpoint**: `PUT /api/Users/{id}`
- **Request Body**: UserDto
- **Response**: Updated UserDto

#### Delete User
- **Endpoint**: `DELETE /api/Users/{id}`
- **Response**: Success message

### Roles

#### Get All Roles
- **Endpoint**: `GET /api/Roles`
- **Response**: Array of RoleDto objects

#### Get Role by ID
- **Endpoint**: `GET /api/Roles/{id}`
- **Response**: RoleDto object

#### Create Role
- **Endpoint**: `POST /api/Roles`
- **Request Body**: RoleDto
- **Response**: Created RoleDto

#### Update Role
- **Endpoint**: `PUT /api/Roles/{id}`
- **Request Body**: RoleDto
- **Response**: Updated RoleDto

#### Delete Role
- **Endpoint**: `DELETE /api/Roles/{id}`
- **Response**: Success message

### Permissions

#### Get All Permissions
- **Endpoint**: `GET /api/Permissions`
- **Response**: Array of PermissionDto objects

#### Get Permission by ID
- **Endpoint**: `GET /api/Permissions/{id}`
- **Response**: PermissionDto object

#### Create Permission
- **Endpoint**: `POST /api/Permissions`
- **Request Body**: PermissionDto
- **Response**: Created PermissionDto

#### Update Permission
- **Endpoint**: `PUT /api/Permissions/{id}`
- **Request Body**: PermissionDto
- **Response**: Updated PermissionDto

#### Delete Permission
- **Endpoint**: `DELETE /api/Permissions/{id}`
- **Response**: Success message

### Systems

#### Get All Systems
- **Endpoint**: `GET /api/Systems`
- **Response**: Array of SystemDto objects

#### Get System by ID
- **Endpoint**: `GET /api/Systems/{id}`
- **Response**: SystemDto object

#### Create System
- **Endpoint**: `POST /api/Systems`
- **Request Body**: SystemDto
- **Response**: Created SystemDto

#### Update System
- **Endpoint**: `PUT /api/Systems/{id}`
- **Request Body**: SystemDto
- **Response**: Updated SystemDto

#### Delete System
- **Endpoint**: `DELETE /api/Systems/{id}`
- **Response**: Success message

### Organizations

#### Get All Organizations
- **Endpoint**: `GET /api/Organizations`
- **Response**: Array of OrganizationDto objects

#### Get Organization by ID
- **Endpoint**: `GET /api/Organizations/{id}`
- **Response**: OrganizationDto object

#### Create Organization
- **Endpoint**: `POST /api/Organizations`
- **Request Body**: OrganizationDto
- **Response**: Created OrganizationDto

#### Update Organization
- **Endpoint**: `PUT /api/Organizations/{id}`
- **Request Body**: OrganizationDto
- **Response**: Updated OrganizationDto

#### Delete Organization
- **Endpoint**: `DELETE /api/Organizations/{id}`
- **Response**: Success message

### Departments

#### Get All Departments
- **Endpoint**: `GET /api/Departments`
- **Response**: Array of DepartmentDto objects

#### Get Department by ID
- **Endpoint**: `GET /api/Departments/{id}`
- **Response**: DepartmentDto object

#### Create Department
- **Endpoint**: `POST /api/Departments`
- **Request Body**: DepartmentDto
- **Response**: Created DepartmentDto

#### Update Department
- **Endpoint**: `PUT /api/Departments/{id}`
- **Request Body**: DepartmentDto
- **Response**: Updated DepartmentDto

#### Delete Department
- **Endpoint**: `DELETE /api/Departments/{id}`
- **Response**: Success message

### Job Titles (Positions)

#### Get All Job Titles
- **Endpoint**: `GET /api/JobTitles`
- **Response**: Array of JobTitleDto objects

#### Get Job Title by ID
- **Endpoint**: `GET /api/JobTitles/{id}`
- **Response**: JobTitleDto object

#### Create Job Title
- **Endpoint**: `POST /api/JobTitles`
- **Request Body**: JobTitleDto
- **Response**: Created JobTitleDto

#### Update Job Title
- **Endpoint**: `PUT /api/JobTitles/{id}`
- **Request Body**: JobTitleDto
- **Response**: Updated JobTitleDto

#### Delete Job Title
- **Endpoint**: `DELETE /api/JobTitles/{id}`
- **Response**: Success message

### User Roles

#### Get All User Roles
- **Endpoint**: `GET /api/UserRoles`
- **Response**: Array of UserRoleDto objects

#### Get User Roles by User ID
- **Endpoint**: `GET /api/UserRoles/user/{userId}`
- **Response**: Array of UserRoleDto objects

#### Create User Role
- **Endpoint**: `POST /api/UserRoles`
- **Request Body**: UserRoleDto
- **Response**: Created UserRoleDto

#### Delete User Role
- **Endpoint**: `DELETE /api/UserRoles/{userId}/{roleId}`
- **Response**: Success message

### Role Permissions

#### Get All Role Permissions
- **Endpoint**: `GET /api/RolePermissions`
- **Response**: Array of RolePermissionDto objects

#### Get Role Permissions by Role ID
- **Endpoint**: `GET /api/RolePermissions/role/{roleId}`
- **Response**: Array of RolePermissionDto objects

#### Create Role Permission
- **Endpoint**: `POST /api/RolePermissions`
- **Request Body**: RolePermissionDto
- **Response**: Created RolePermissionDto

#### Delete Role Permission
- **Endpoint**: `DELETE /api/RolePermissions/{roleId}/{permissionId}`
- **Response**: Success message

### Role Systems

#### Get All Role Systems
- **Endpoint**: `GET /api/RoleSystems`
- **Response**: Array of RoleSystemDto objects

#### Get Role Systems by Role ID
- **Endpoint**: `GET /api/RoleSystems/role/{roleId}`
- **Response**: Array of RoleSystemDto objects

#### Create Role System
- **Endpoint**: `POST /api/RoleSystems`
- **Request Body**: RoleSystemDto
- **Response**: Created RoleSystemDto

#### Delete Role System
- **Endpoint**: `DELETE /api/RoleSystems/{roleId}/{systemId}`
- **Response**: Success message

### User Systems

#### Get All User Systems
- **Endpoint**: `GET /api/UserSystems`
- **Response**: Array of UserSystemDto objects

#### Get User Systems by User ID
- **Endpoint**: `GET /api/UserSystems/user/{userId}`
- **Response**: Array of UserSystemDto objects

#### Create User System
- **Endpoint**: `POST /api/UserSystems`
- **Request Body**: UserSystemDto
- **Response**: Created UserSystemDto

#### Update User System
- **Endpoint**: `PUT /api/UserSystems`
- **Request Body**: UserSystemDto
- **Response**: Updated UserSystemDto

#### Delete User System
- **Endpoint**: `DELETE /api/UserSystems/{userId}/{systemId}`
- **Response**: Success message

### Structures

#### Get All Structures
- **Endpoint**: `GET /api/Structures`
- **Response**: Array of StructureDto objects

#### Get Structure by ID
- **Endpoint**: `GET /api/Structures/{id}`
- **Response**: StructureDto object

#### Create Structure
- **Endpoint**: `POST /api/Structures`
- **Request Body**: StructureDto
- **Response**: Created StructureDto

#### Update Structure
- **Endpoint**: `PUT /api/Structures/{id}`
- **Request Body**: StructureDto
- **Response**: Updated StructureDto

#### Delete Structure
- **Endpoint**: `DELETE /api/Structures/{id}`
- **Response**: Success message

## Data Transfer Objects (DTOs)

### UserDto
```typescript
{
  id: number;
  fullName: string;
  email: string;
  adUsername: string;
  civilNo?: string;
  jobTitleId?: number;
  isActive: boolean;
  lastLogin?: Date;
  failedLoginAttempts: number;
  isLocked: boolean;
}
```

### RoleDto
```typescript
{
  id: number;
  name: string;
  systemId?: number;
  isActive: boolean;
}
```

### PermissionDto
```typescript
{
  id: number;
  name: string;
  code: string;
  systemId: number;
  isActive: boolean;
}
```

### SystemDto
```typescript
{
  id: number;
  name: string;
  code: string;
  serverIP: string;
  domain: string;
  database: string;
  startDate?: Date;
  loginMethod: number; // 1: KMNID, 2: ActiveDirectory, 3: Credentials
  isActive: boolean;
}
```

### OrganizationDto
```typescript
{
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}
```

### DepartmentDto
```typescript
{
  id: number;
  name: string;
  code: string;
  organizationId: number;
  isActive: boolean;
}
```

### JobTitleDto
```typescript
{
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}
```

### UserRoleDto
```typescript
{
  userId: number;
  roleId: number;
}
```

### RolePermissionDto
```typescript
{
  roleId: number;
  permissionId: number;
}
```

### RoleSystemDto
```typescript
{
  roleId: number;
  systemId: number;
}
```

### UserSystemDto
```typescript
{
  userId: number;
  systemId: number;
  accessLevel?: string;
}
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Invalid request data.",
  "result": null
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Invalid credentials.",
  "result": false
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "User is not authorized to access this system.",
  "result": false
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found.",
  "result": null
}
```

## Pagination

For endpoints supporting pagination:

**Query Parameters**:
- `take`: Number of records to return (default: all)
- `skip`: Number of records to skip (default: 0)
- `orderBy`: Field name to order by
- `orderByDirection`: `Ascending` or `Descending`

**Example**:
```
GET /api/Users?take=10&skip=0&orderBy=FullName&orderByDirection=Ascending
```

## Swagger Documentation

Interactive API documentation is available at:
- **Development**: `https://localhost:5001/swagger`

Swagger UI provides:
- All available endpoints
- Request/response schemas
- Try-it-out functionality
- Authentication support

## Testing

### Using Swagger UI

1. Navigate to `/swagger`
2. Click "Authorize" button
3. Enter JWT token: `Bearer <your-token>`
4. Test endpoints directly from Swagger UI

### Using HTTP File

A `UMS.http` file is included in the backend project for testing with REST clients.

### Using Postman

1. Import the API collection (if available)
2. Set base URL: `https://localhost:5001/api`
3. Add Authorization header: `Bearer <token>`
4. Test endpoints

## Rate Limiting

Currently, there is no rate limiting implemented. Consider adding rate limiting for production environments.

## CORS

CORS is configured to allow all origins in development. For production, configure specific allowed origins in `Program.cs`.

