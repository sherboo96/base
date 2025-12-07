using UMS.Data;
using UMS.Interfaces;
using UMS.Models;
using Microsoft.AspNetCore.Identity;

namespace UMS.Services;

public class DataSeeder
{
    private readonly ApplicationDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly UserManager<User> _userManager;
    private readonly SystemConfigurationService _configService;
    private readonly ILogger<DataSeeder> _logger;

    public DataSeeder(
        ApplicationDbContext context, 
        IUnitOfWork unitOfWork, 
        UserManager<User> userManager,
        SystemConfigurationService configService,
        ILogger<DataSeeder> logger)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _configService = configService;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            _logger.LogInformation("Starting database seeding...");

            // Seed System Configurations
            await SeedSystemConfigurationsAsync();

            // Seed Main Organization
            var mainOrganization = await SeedMainOrganizationAsync();

            // Seed Permissions
            await SeedPermissionsAsync();

            // Seed SuperAdmin Role
            var superAdminRole = await SeedSuperAdminRoleAsync();

            // Seed SuperAdmin User
            await SeedSuperAdminUserAsync(superAdminRole, mainOrganization);

            // Assign all permissions to SuperAdmin role
            await AssignPermissionsToSuperAdminAsync(superAdminRole);

            _logger.LogInformation("Database seeding completed successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An error occurred while seeding the database.");
            throw;
        }
    }

    private async Task SeedSystemConfigurationsAsync()
    {
        _logger.LogInformation("Seeding system configurations...");

        var configurations = new Dictionary<string, (string Value, string Description)>
        {
            { "LoginMethod.Credentials.Enabled", ("true", "Enable credentials-based login (username/password)") },
            { "LoginMethod.ActiveDirectory.Enabled", ("true", "Enable Active Directory login") },
            { "LoginMethod.KMNID.Enabled", ("false", "Enable KMNID login") },
            { "LoginMethod.Default", ("ActiveDirectory", "Default login method") }
        };

        foreach (var config in configurations)
        {
            await _configService.SetConfigurationValueAsync(config.Key, config.Value.Value, config.Value.Description);
            _logger.LogInformation($"Configured: {config.Key} = {config.Value.Value}");
        }

        _logger.LogInformation("System configurations seeded successfully.");
    }

    private async Task<Organization> SeedMainOrganizationAsync()
    {
        _logger.LogInformation("Seeding main organization...");

        // Check if there's already a main organization
        var existingMainOrg = await _unitOfWork.Organizations.FindAsync(o => o.IsMain == true);
        if (existingMainOrg != null)
        {
            _logger.LogInformation("Main organization already exists.");
            return existingMainOrg;
        }

        // If there are any organizations, unset their IsMain flag
        var allOrgs = await _unitOfWork.Organizations.GetAllAsync();
        foreach (var org in allOrgs)
        {
            if (org.IsMain)
            {
                org.IsMain = false;
                org.UpdatedAt = DateTime.UtcNow;
                org.UpdatedBy = "System";
                await _unitOfWork.Organizations.UpdateAsync(org);
            }
        }

        // Create main organization
        var mainOrganization = new Organization
        {
            Name = "Ministry of Oil",
            NameAr = "وزارة النفط",
            Code = "MOIL",
            Domain = "moo.gov.kw",
            IsMain = true,
            IsActive = true,
            CreatedBy = "System",
            CreatedOn = DateTime.UtcNow
        };

        var createdOrg = await _unitOfWork.Organizations.AddAsync(mainOrganization);
        await _unitOfWork.CompleteAsync();

        _logger.LogInformation("Main organization created successfully.");
        return createdOrg;
    }

    private async Task SeedPermissionsAsync()
    {
        _logger.LogInformation("Seeding permissions...");

        var permissions = new List<Permission>
        {
            // User Management Permissions
            new Permission { Name = "View Users", Code = "USERS_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Create Users", Code = "USERS_CREATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Update Users", Code = "USERS_UPDATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Delete Users", Code = "USERS_DELETE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // Role Management Permissions
            new Permission { Name = "View Roles", Code = "ROLES_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Create Roles", Code = "ROLES_CREATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Update Roles", Code = "ROLES_UPDATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Delete Roles", Code = "ROLES_DELETE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // Permission Management Permissions
            new Permission { Name = "View Permissions", Code = "PERMISSIONS_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Create Permissions", Code = "PERMISSIONS_CREATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Update Permissions", Code = "PERMISSIONS_UPDATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Delete Permissions", Code = "PERMISSIONS_DELETE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // Role Permission Management
            new Permission { Name = "View Role Permissions", Code = "ROLE_PERMISSIONS_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Assign Role Permissions", Code = "ROLE_PERMISSIONS_ASSIGN", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Remove Role Permissions", Code = "ROLE_PERMISSIONS_REMOVE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // Organization Management Permissions
            new Permission { Name = "View Organizations", Code = "ORGANIZATIONS_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Create Organizations", Code = "ORGANIZATIONS_CREATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Update Organizations", Code = "ORGANIZATIONS_UPDATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Delete Organizations", Code = "ORGANIZATIONS_DELETE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // Department Management Permissions
            new Permission { Name = "View Departments", Code = "DEPARTMENTS_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Create Departments", Code = "DEPARTMENTS_CREATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Update Departments", Code = "DEPARTMENTS_UPDATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Delete Departments", Code = "DEPARTMENTS_DELETE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // Job Title Management Permissions
            new Permission { Name = "View Job Titles", Code = "JOB_TITLES_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Create Job Titles", Code = "JOB_TITLES_CREATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Update Job Titles", Code = "JOB_TITLES_UPDATE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Delete Job Titles", Code = "JOB_TITLES_DELETE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // User Role Management
            new Permission { Name = "View User Roles", Code = "USER_ROLES_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Assign User Roles", Code = "USER_ROLES_ASSIGN", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
            new Permission { Name = "Remove User Roles", Code = "USER_ROLES_REMOVE", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // Dashboard Permissions
            new Permission { Name = "View Dashboard", Code = "DASHBOARD_VIEW", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },

            // System Administration Permissions
            new Permission { Name = "System Administration", Code = "SYSTEM_ADMIN", IsActive = true, CreatedBy = "System", CreatedOn = DateTime.UtcNow },
        };

        foreach (var permission in permissions)
        {
            var existingPermission = await _unitOfWork.Permissions.FindAsync(p => p.Code == permission.Code);
            if (existingPermission == null)
            {
                await _unitOfWork.Permissions.AddAsync(permission);
                _logger.LogInformation($"Added permission: {permission.Name} ({permission.Code})");
            }
        }

        await _unitOfWork.CompleteAsync();
        _logger.LogInformation("Permissions seeded successfully.");
    }

    private async Task<Role> SeedSuperAdminRoleAsync()
    {
        _logger.LogInformation("Seeding SuperAdmin role...");

        var existingRole = await _unitOfWork.Roles.FindAsync(r => r.Name == "SuperAdmin");
        if (existingRole != null)
        {
            _logger.LogInformation("SuperAdmin role already exists.");
            return existingRole;
        }

        var superAdminRole = new Role
        {
            Name = "SuperAdmin",
            IsActive = true,
            CreatedBy = "System",
            CreatedOn = DateTime.UtcNow
        };

        var createdRole = await _unitOfWork.Roles.AddAsync(superAdminRole);
        await _unitOfWork.CompleteAsync();

        _logger.LogInformation("SuperAdmin role created successfully.");
        return createdRole;
    }

    private async Task SeedSuperAdminUserAsync(Role superAdminRole, Organization mainOrganization)
    {
        _logger.LogInformation("Seeding SuperAdmin user...");

        var existingUser = await _userManager.FindByEmailAsync("superadmin@system.local");
        if (existingUser != null)
        {
            _logger.LogInformation("SuperAdmin user already exists.");

            // Ensure user has organization
            if (existingUser.OrganizationId != mainOrganization.Id)
            {
                existingUser.OrganizationId = mainOrganization.Id;
                existingUser.UpdatedAt = DateTime.UtcNow;
                existingUser.UpdatedBy = "System";
                await _userManager.UpdateAsync(existingUser);
            }

            // Ensure SuperAdmin role is assigned
            var existingUserRole = await _unitOfWork.UserRoles.FindAsync(ur => ur.UserId == existingUser.Id && ur.RoleId == superAdminRole.Id);
            if (existingUserRole == null)
            {
                var userRole = new UserRole
                {
                    UserId = existingUser.Id,
                    RoleId = superAdminRole.Id
                };
                await _unitOfWork.UserRoles.AddAsync(userRole);
                await _unitOfWork.CompleteAsync();
                _logger.LogInformation("SuperAdmin role assigned to existing user.");
            }
            return;
        }

        var superAdminUser = new User
        {
            FullName = "Super Administrator",
            UserName = "superadmin",
            Email = "superadmin@system.local",
            EmailConfirmed = true,
            ADUsername = "superadmin",
            LoginMethod = LoginMethod.Credentials,
            OrganizationId = mainOrganization.Id, // Required - assign to main organization
            DepartmentId = null, // Not required for main org users, but can be set later
            IsActive = true,
            IsLocked = false,
            FailedLoginAttempts = 0,
            CreatedBy = "System",
            CreatedOn = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(superAdminUser, "Admin@123");
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new Exception($"Failed to create superadmin user: {errors}");
        }

        // Assign SuperAdmin role to user
        var newUserRole = new UserRole
        {
            UserId = superAdminUser.Id,
            RoleId = superAdminRole.Id
        };
        await _unitOfWork.UserRoles.AddAsync(newUserRole);
        await _unitOfWork.CompleteAsync();

        _logger.LogInformation($"SuperAdmin user created successfully. Username: superadmin, Password: Admin@123");
    }

    private async Task AssignPermissionsToSuperAdminAsync(Role superAdminRole)
    {
        _logger.LogInformation("Assigning all permissions to SuperAdmin role...");

        var allPermissions = await _unitOfWork.Permissions.GetAllAsync();
        var existingRolePermissions = await _unitOfWork.RolePermissions.GetAllAsync(rp => rp.RoleId == superAdminRole.Id);

        var existingPermissionIds = existingRolePermissions.Select(rp => rp.PermissionId).ToHashSet();
        var permissionsToAdd = allPermissions.Where(p => !existingPermissionIds.Contains(p.Id)).ToList();

        foreach (var permission in permissionsToAdd)
        {
            var rolePermission = new RolePermission
            {
                RoleId = superAdminRole.Id,
                PermissionId = permission.Id
            };
            await _unitOfWork.RolePermissions.AddAsync(rolePermission);
            _logger.LogInformation($"Assigned permission '{permission.Name}' to SuperAdmin role.");
        }

        if (permissionsToAdd.Any())
        {
            await _unitOfWork.CompleteAsync();
            _logger.LogInformation($"Assigned {permissionsToAdd.Count} permissions to SuperAdmin role.");
        }
        else
        {
            _logger.LogInformation("All permissions are already assigned to SuperAdmin role.");
        }
    }
}

