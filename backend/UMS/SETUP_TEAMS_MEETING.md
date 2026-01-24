# Teams Meeting Setup Instructions

## Required NuGet Packages

The following packages need to be installed for Teams meeting functionality:

```xml
<PackageReference Include="Azure.Identity" Version="1.10.0" />
<PackageReference Include="Microsoft.Graph" Version="5.0.0" />
```

These have been added to `UMS.csproj`. Run `dotnet restore` to install them.

## Azure AD Configuration

Add the following configuration to `appsettings.json`:

```json
{
  "AzureAd": {
    "TenantId": "your-tenant-id",
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret"
  }
}
```

## Azure AD App Registration

1. Register an application in Azure AD
2. Grant admin consent for the following permissions:
   - `Calendars.ReadWrite`
   - `OnlineMeetings.ReadWrite`
   - `User.Read`
3. Create a client secret and add it to `appsettings.json`

## Usage

The Teams meeting button will appear on the course details page (`/management/courses/details/:id`) when:
- Course status is `RegistrationClosed` (3)
- Course has `availableOnlineSeats > 0`

Clicking the button will create a Teams meeting with all approved online enrollments as attendees.
