# Frontend Documentation

## Overview

The frontend is built with **Angular 18** using TypeScript, following component-based architecture with services for business logic.

## Technology Stack

- **Framework**: Angular 18
- **Language**: TypeScript 5.5
- **Styling**: Tailwind CSS 3.4
- **UI Libraries**:
  - FontAwesome 6.7
  - ngx-toastr 19.0 (Notifications)
  - @ngneat/dialog 5.1 (Modal dialogs)
  - ngx-extended-pdf-viewer 23.1
- **State Management**: RxJS Observables
- **HTTP Client**: Angular HttpClient

## Project Structure

```
src/
├── app/
│   ├── components/          # Reusable components
│   │   ├── generic/
│   │   │   ├── generic-table.component.ts
│   │   │   ├── generic-modal.component.ts
│   │   │   └── pagination.component.ts
│   │   ├── loading/
│   │   │   └── loading.component.ts
│   │   ├── nav-bar/
│   │   │   └── nav-bar.component.ts
│   │   ├── side-menu/
│   │   │   └── side-menu.component.ts
│   │   ├── searchable-select/
│   │   │   └── searchable-select.component.ts
│   │   ├── dialog/
│   │   │   └── dialog.component.ts
│   │   └── delete-confirmation-dialog/
│   │       └── delete-confirmation-dialog.component.ts
│   │
│   ├── pages/               # Feature pages
│   │   ├── dashboard/
│   │   │   └── dashboard.component.ts
│   │   ├── login/
│   │   │   └── login.component.ts
│   │   ├── unauthorized/
│   │   │   └── unauthorized.component.ts
│   │   ├── profile/
│   │   │   └── profile.component.ts
│   │   ├── request/
│   │   │   ├── request.component.ts
│   │   │   └── request-details/
│   │   │       └── request-details.component.ts
│   │   └── management/       # Management modules
│   │       ├── user/
│   │       ├── role/
│   │       ├── permission/
│   │       ├── system/
│   │       ├── organization/
│   │       ├── department/
│   │       ├── position/
│   │       ├── user-role/
│   │       ├── role-permission/
│   │       ├── role-system/
│   │       └── user-system/
│   │
│   ├── services/             # Business logic services
│   │   ├── api.service.ts
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts
│   │   ├── auth.interceptor.ts
│   │   ├── user.service.ts
│   │   ├── role.service.ts
│   │   ├── permission.service.ts
│   │   ├── system.service.ts
│   │   ├── organization.service.ts
│   │   ├── department.service.ts
│   │   ├── position.service.ts
│   │   ├── user-systems.service.ts
│   │   ├── request.service.ts
│   │   ├── dialog.service.ts
│   │   ├── loading.service.ts
│   │   ├── storage.service.ts
│   │   └── validator.service.ts
│   │
│   ├── guards/               # Route guards
│   │   └── permission.guard.ts
│   │
│   ├── interceptors/         # HTTP interceptors
│   │   ├── auth.interceptor.ts
│   │   └── loading.interceptor.ts
│   │
│   ├── models/               # TypeScript models
│   │   ├── user.model.ts
│   │   ├── system.model.ts
│   │   └── user-system.model.ts
│   │
│   ├── app.component.ts      # Root component
│   ├── app.config.ts         # Application configuration
│   └── app.routes.ts         # Route configuration
│
├── assets/                   # Static assets
│   └── images/
│
├── environments/             # Environment configuration
│   └── environment.ts
│
├── index.html                # Entry HTML
├── main.ts                   # Application bootstrap
└── styles.css                # Global styles
```

## Core Components

### Generic Components

#### GenericTableComponent

Reusable table component with:
- Sorting
- Pagination
- Search/filtering
- Action buttons
- Customizable columns

#### GenericModalComponent

Reusable modal component for forms:
- Form validation
- Submit/cancel actions
- Customizable content

#### PaginationComponent

Pagination component:
- Page navigation
- Items per page selection
- Total count display

#### LoadingComponent

Loading indicator component:
- Global loading state
- Spinner animation

#### SearchableSelectComponent

Searchable dropdown component:
- Search functionality
- Multi-select support
- Custom display values

### Page Components

#### LoginComponent

User authentication:
- Username/password input
- System selection
- Login form validation
- Error handling

#### DashboardComponent

Main dashboard:
- User statistics
- Quick actions
- Recent activity

#### Management Components

Each management module follows a consistent pattern:

- **List Component**: Displays data in a table
- **Form Component**: Handles create/edit operations
- **Service**: Business logic and API calls

Example: `UserComponent` + `UserFormComponent` + `UserService`

### Services

#### ApiService

Base API service providing HTTP methods:

```typescript
getData(endpoint: string, params?: any): Observable<any>
postData(endpoint: string, data: any): Observable<any>
updateData(endpoint: string, data: any): Observable<any>
deleteData(endpoint: string): Observable<any>
```

#### AuthService

Authentication service:

```typescript
login(credentials): Observable<any>
logout(): void
isAuthenticated(): boolean
getToken(): string | null
```

**State Management**: Uses `BehaviorSubject` for current user state

#### StorageService

LocalStorage wrapper:

```typescript
setItem(key: string, value: any): void
getItem(key: string): any
removeItem(key: string): void
clear(): void
```

#### Entity Services

Each entity has a dedicated service:
- `UserService`
- `RoleService`
- `PermissionService`
- `SystemService`
- `OrganizationService`
- `DepartmentService`
- `PositionService`
- `UserSystemsService`

### Guards

#### AuthGuard

Protects routes requiring authentication:

- Checks if user is authenticated
- Redirects to login if not authenticated
- Supports `redirectIfLoggedIn` flag

#### PermissionGuard

Protects routes requiring specific permissions:

- Checks user permissions
- Redirects to unauthorized page if no permission
- Uses permission codes (e.g., 'UMS0000')

### Interceptors

#### AuthInterceptor

Automatically adds JWT token to requests:

```typescript
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  const token = this.storageService.getItem('token');
  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }
  return next.handle(req);
}
```

#### LoadingInterceptor

Manages global loading state:

- Shows loading indicator during HTTP requests
- Integrates with `LoadingService`

## Routing

### Route Configuration

Routes are defined in `app.routes.ts`:

```typescript
{
  path: 'management/users',
  component: UserComponent,
  canActivate: [AuthGuard, PermissionGuard],
  data: {
    redirectIfLoggedIn: false,
    permission: 'UMS0011'
  }
}
```

### Route Guards

- **AuthGuard**: Applied to protected routes
- **PermissionGuard**: Applied to permission-restricted routes

### Route Structure

```
/                    → Redirect to login
/login               → Login page
/dashboard           → Dashboard
/unauthorized        → Unauthorized page
/profile             → User profile
/management/
  ├── organization   → Organization management
  ├── department     → Department management
  ├── positions      → Position management
  ├── users          → User management
  ├── systems        → System management
  ├── permissions    → Permission management
  ├── roles          → Role management
  ├── rolePermissions → Role-Permission management
  ├── roleSystems    → Role-System management
  ├── userSystems    → User-System management
  └── userRoles      → User-Role management
```

## State Management

### Authentication State

Managed by `AuthService` using `BehaviorSubject`:

```typescript
private currentUserSubject = new BehaviorSubject<any>(null);
public currentUser$ = this.currentUserSubject.asObservable();
```

### Local Storage

- **Token**: JWT token stored in localStorage
- **Current User**: User object stored in localStorage
- **Persistence**: Data persists across page refreshes

## HTTP Communication

### Base URL

Configured in `environment.ts`:

```typescript
export const environment = {
  production: false,
  baseUrl: 'https://tech.moo.gov.kw/ums/api'
};
```

### Request/Response Format

All API calls return `BaseResponse<T>`:

```typescript
interface BaseResponse<T> {
  statusCode: number;
  message: string;
  result: T;
}
```

### Error Handling

Errors are handled in:
- **Interceptors**: Global error handling
- **Services**: Service-level error handling
- **Components**: Component-level error handling

## Forms

### Reactive Forms

Angular Reactive Forms are used throughout:

```typescript
this.form = this.fb.group({
  name: ['', Validators.required],
  email: ['', [Validators.required, Validators.email]]
});
```

### Validation

- **Built-in Validators**: Required, Email, MinLength, etc.
- **Custom Validators**: `ValidatorService` for custom validation
- **Form State**: Tracks touched, dirty, valid states

## UI/UX Features

### Notifications

Using `ngx-toastr`:
- Success messages
- Error messages
- Warning messages
- Info messages

### Loading States

- Global loading indicator
- Component-level loading states
- Skeleton loaders (if implemented)

### Modals

Using `@ngneat/dialog`:
- Confirmation dialogs
- Form modals
- Custom dialogs

## Styling

### Tailwind CSS

Utility-first CSS framework:
- Responsive design
- Custom components
- Utility classes

### Component Styles

- Component-scoped styles
- SCSS support
- Global styles in `styles.css`

## Environment Configuration

### Development

```typescript
export const environment = {
  production: false,
  baseUrl: 'https://tech.moo.gov.kw/ums/api',
  encryptionKey: 'MOOP@ssw0rd20242025'
};
```

### Production

Create `environment.prod.ts` for production settings.

## Best Practices

1. **Component Architecture**: Single responsibility principle
2. **Service Layer**: Business logic in services
3. **Type Safety**: Strong typing with TypeScript
4. **Reactive Programming**: RxJS for async operations
5. **Error Handling**: Comprehensive error handling
6. **Code Reusability**: Generic components and services
7. **Performance**: OnPush change detection strategy (where applicable)
8. **Accessibility**: ARIA attributes and semantic HTML

## Development

### Running the Application

```bash
npm install
npm start
# Navigate to http://localhost:4200
```

### Building for Production

```bash
npm run build
# Output in dist/ folder
```

### Testing

```bash
npm test
```

## Future Enhancements

- [ ] State management library (NgRx/Akita)
- [ ] Unit tests
- [ ] E2E tests
- [ ] Internationalization (i18n)
- [ ] Dark mode
- [ ] Advanced filtering
- [ ] Export functionality
- [ ] Real-time updates (WebSocket)
- [ ] Progressive Web App (PWA)

