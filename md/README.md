# User Management System (UMS)

A comprehensive User Management System built with Angular 18 frontend and ASP.NET Core 8.0 backend, featuring role-based access control, multi-system support, and Active Directory integration.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Architecture](#architecture)

## 🎯 Overview

The User Management System (UMS) is an enterprise-grade application designed to manage users, roles, permissions, and system access across multiple organizational systems. It provides a centralized platform for:

- User authentication and authorization
- Role-based access control (RBAC)
- Multi-system access management
- Organizational hierarchy management
- Permission management
- Active Directory integration

## ✨ Features

### Core Features

- **User Management**: Complete user lifecycle management with AD integration
- **Role-Based Access Control**: Flexible role and permission system
- **Multi-System Support**: Manage access across multiple systems
- **Organizational Structure**: Support for Organizations, Departments, and Positions
- **Authentication Methods**: 
  - Active Directory (LDAP)
  - KMNID authentication
  - Credential-based authentication
- **Security Features**:
  - JWT token-based authentication
  - Account locking after failed login attempts
  - Permission-based route guards
  - Secure API endpoints

### Management Modules

- **Organizations**: Manage organizational units
- **Departments**: Department management with user assignments
- **Positions/Job Titles**: Position management
- **Users**: User CRUD operations with AD sync
- **Systems**: System registration and configuration
- **Roles**: Role creation and management
- **Permissions**: Permission management per system
- **Role Permissions**: Assign permissions to roles
- **Role Systems**: Assign systems to roles
- **User Systems**: Assign system access to users
- **User Roles**: Assign roles to users

## 🛠 Technology Stack

### Frontend
- **Framework**: Angular 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Libraries**: 
  - FontAwesome
  - ngx-toastr (Notifications)
  - @ngneat/dialog (Modal dialogs)
  - ngx-extended-pdf-viewer

### Backend
- **Framework**: ASP.NET Core 8.0
- **Language**: C#
- **ORM**: Entity Framework Core 9.0
- **Database**: SQL Server
- **Authentication**: JWT Bearer Tokens
- **Directory Services**: System.DirectoryServices (LDAP)
- **API Documentation**: Swagger/OpenAPI

## 📁 Project Structure

```
.
├── frontend/              # Angular 18 frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Reusable components
│   │   │   ├── pages/         # Page components
│   │   │   ├── services/      # Angular services
│   │   │   ├── guards/        # Route guards
│   │   │   ├── interceptors/  # HTTP interceptors
│   │   │   └── models/        # TypeScript models
│   │   └── environments/      # Environment configuration
│   └── package.json
│
├── backend/               # ASP.NET Core 8.0 backend API
│   └── UMS/                # UMS project (namespace: UMS)
│       ├── Controllers/   # API controllers
│       ├── Models/        # Entity models
│       ├── Dtos/          # Data transfer objects
│       ├── Services/      # Business logic services
│       ├── Repository/    # Data access layer
│       ├── Data/          # DbContext and migrations
│       └── Interfaces/    # Repository interfaces
│
└── md/                    # Documentation files
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **.NET 8.0 SDK**
- **SQL Server** (2019 or higher)
- **Active Directory** (for LDAP authentication)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Development
   ```

2. **Backend Setup**
   ```bash
   cd backend/UMS
   # Update connection string in appsettings.json
   dotnet restore
   dotnet ef database update
   dotnet run
   ```
   
   **Or open in Visual Studio**: Open `backend/backend.sln`
   
   **Or open in Visual Studio**: Open `backend/backend.sln`

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:4200
   - Backend API: https://localhost:5001
   - Swagger UI: https://localhost:5001/swagger

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## 📚 Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - System architecture and design patterns
- [Backend Documentation](./BACKEND.md) - Backend API details and implementation
- [Frontend Documentation](./FRONTEND.md) - Frontend components and services
- [API Documentation](./API.md) - API endpoints and usage
- [Database Schema](./DATABASE.md) - Database structure and relationships
- [Setup Guide](./SETUP.md) - Detailed installation and configuration

## 🏗 Architecture

The system follows a clean architecture pattern with clear separation of concerns:

- **Frontend**: Component-based architecture with services for business logic
- **Backend**: Repository pattern with Unit of Work for data access
- **Authentication**: JWT tokens with LDAP integration
- **Authorization**: Permission-based route guards and API authorization

For detailed architecture information, see [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🔐 Security

- JWT token-based authentication
- Role-based access control (RBAC)
- Permission-based authorization
- Account locking mechanism
- Secure password handling (LDAP)
- CORS configuration
- HTTPS enforcement

## 📝 License

[Add your license information here]

## 👥 Contributors

[Add contributor information here]

## 📞 Support

For issues, questions, or contributions, please [create an issue](link-to-issues) or contact the development team.

