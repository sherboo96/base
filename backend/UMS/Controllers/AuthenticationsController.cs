using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using UMS.Dtos.Authentication;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;
using Microsoft.Extensions.Hosting;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthenticationsController : ControllerBase
{
    private readonly LdapAuthenticator _ldapAuthenticator;
    private readonly PasswordHasher _passwordHasher;
    private readonly UserManager<User> _userManager;
    private readonly SystemConfigurationService _configService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly JwtTokenGenerator _jwt;
    private readonly IHostEnvironment _env;

    public AuthenticationsController(
        LdapAuthenticator ldapAuthenticator, 
        PasswordHasher passwordHasher,
        UserManager<User> userManager,
        SystemConfigurationService configService,
        IUnitOfWork unitOfWork, 
        JwtTokenGenerator jwt, 
        IHostEnvironment env)
    {
        _ldapAuthenticator = ldapAuthenticator;
        _passwordHasher = passwordHasher;
        _userManager = userManager;
        _configService = configService;
        _unitOfWork = unitOfWork;
        _jwt = jwt;
        _env = env;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        // Find user by username or email using UserManager (this ensures proper tracking)
        User? user = await _userManager.FindByEmailAsync(request.Username) 
                     ?? await _userManager.FindByNameAsync(request.Username);
        
        // If not found via UserManager, try ADUsername (but this won't be tracked by Identity)
        if (user == null)
        {
            var untrackedUser = await _unitOfWork.Users.FindAsync(u => u.ADUsername == request.Username);
            if (untrackedUser != null)
            {
                // Reload via UserManager to get tracked instance
                user = await _userManager.FindByIdAsync(untrackedUser.Id);
            }
        }

            if (user is null)
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "User not found.", Result = false });

        // Check if the login method is enabled in system configuration
        var isLoginMethodEnabled = await _configService.IsLoginMethodEnabledAsync(user.LoginMethod);
        if (!isLoginMethodEnabled)
        {
            return BadRequest(new BaseResponse<bool> 
            { 
                StatusCode = 400, 
                Message = $"Login method '{user.LoginMethod}' is not enabled in system configuration.", 
                Result = false 
            });
        }

        // Development mode - bypass authentication (for testing)
        if (_env.IsDevelopment() && request.Username.StartsWith("Test"))
        {
            return await ValidateAndProcessLogin(user);
        }

        // Determine authentication method based on user's LoginMethod setting
        bool isValidCredentials = false;

        if (user.LoginMethod == LoginMethod.Credentials)
        {
            // Credentials-based authentication using Identity
            isValidCredentials = await _userManager.CheckPasswordAsync(user, request.Password);
        }
        else if (user.LoginMethod == LoginMethod.ActiveDirectory)
        {
            // Active Directory authentication
        var adUser = _ldapAuthenticator.GetUserFromDomain(request.Username);
        if (adUser is null)
            {
                return NotFound(new BaseResponse<bool> 
                { 
                    StatusCode = 404, 
                    Message = "User not found in Active Directory.", 
                    Result = false 
                });
            }

            isValidCredentials = _ldapAuthenticator.ValidateCredentials(request.Username, request.Password);
        }
        else
        {
            return BadRequest(new BaseResponse<bool> 
            { 
                StatusCode = 400, 
                Message = "Invalid login method configured for this user.", 
                Result = false 
            });
        }

        // Handle failed authentication
        if (!isValidCredentials)
        {
            user.FailedLoginAttempts += 1;
            if (user.FailedLoginAttempts >= 5)
            {
                user.IsLocked = true;
                await _userManager.SetLockoutEndDateAsync(user, DateTimeOffset.UtcNow.AddMinutes(30));
            }
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = "Login System";
            await _userManager.UpdateAsync(user);

            return Unauthorized(new BaseResponse<bool> 
            { 
                StatusCode = 401, 
                Message = "Invalid username or password.", 
                Result = false 
            });
        }

        return await ValidateAndProcessLogin(user);
    }

    private async Task<IActionResult> ValidateAndProcessLogin(User user)
    {
        // Common validation checks
        if (user.IsLocked)
        {
            return StatusCode(403, new BaseResponse<bool>
            {
                StatusCode = 403,
                Message = "Your account is locked due to multiple failed login attempts. Please contact the system administrator to restore access.",
                Result = false
            });
        }

        if (!user.IsActive)
        {
            return StatusCode(403, new BaseResponse<bool>
            {
                StatusCode = 403,
                Message = "Your account is disabled. Please contact the system administrator to activate it.",
                Result = false
            });
        }

        return await ProcessSuccessfulLogin(user);
    }

    private async Task<IActionResult> ProcessSuccessfulLogin(User user)
    {
        // Load organization separately if not loaded (using untracked query to avoid conflicts)
        Organization? organization = null;
        if (user.Organization == null)
        {
            organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == user.OrganizationId);
        }
        else
        {
            organization = user.Organization;
        }

        // Get user's roles
        var userRoles = await _unitOfWork.UserRoles.GetAllAsync(ur => ur.UserId == user.Id, new[] { "Role" });
        var firstRole = userRoles.FirstOrDefault();
        var roleId = firstRole?.RoleId;

        var token = _jwt.GenerateToken(user.Id, user.FullName, null, organization?.Code ?? "", roleId);

        // Reset failed login attempts and update last login using UserManager (user is already tracked)
        user.FailedLoginAttempts = 0;
        user.IsLocked = false;
        user.LastLogin = DateTime.UtcNow;
        user.UpdatedBy = user.FullName;
        user.UpdatedAt = DateTime.UtcNow;
        await _userManager.SetLockoutEndDateAsync(user, null); // Remove lockout
        await _userManager.UpdateAsync(user);

        // Build response DTO
        var response = new LoginResponseDto
        {
            token = token,
            user = new LoginUserDto
            {
                id = user.Id,
                fullName = user.FullName,
                lastLogin = user.LastLogin,
                loginMethod = new LoginMethodDto
                {
                    id = (int)user.LoginMethod,
                    name = user.LoginMethod.ToString()
                },
                isTemporaryPassword = user.IsTemporaryPassword,
                emailVerified = user.EmailVerified,
                organization = organization != null ? new LoginOrganizationDto
                {
                    id = organization.Id,
                    name = organization.Name,
                    code = organization.Code,
                    isMain = organization.IsMain,
                    isActive = organization.IsActive
                } : null,
                createdOn = user.CreatedOn,
                createdBy = user.CreatedBy,
                updatedAt = user.UpdatedAt,
                updatedBy = user.UpdatedBy,
                userName = user.UserName ?? "",
                email = user.Email ?? "",
                emailConfirmed = user.EmailConfirmed
            },
            roles = userRoles.Select(ur => new LoginRoleDto
            {
                id = ur.Role.Id,
                name = ur.Role.Name,
                isActive = ur.Role.IsActive,
                isDeleted = ur.Role.IsDeleted,
                createdOn = ur.Role.CreatedOn,
                createdBy = ur.Role.CreatedBy
            }).ToList()
        };

        return Ok(new BaseResponse<LoginResponseDto>
        {
            StatusCode = 200,
            Message = "Login successful.",
            Result = response
        });
    }

    [HttpGet("permissions")]
    [Authorize]
    public async Task<IActionResult> GetUserPermissions()
    {
        // Extract user ID from JWT token
        var userIdClaim = User.FindFirst("UserId")?.Value 
                         ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
        {
            return Unauthorized(new BaseResponse<IEnumerable<UserPermissionsDto>>
            {
                StatusCode = 401,
                Message = "User ID not found in token.",
                Result = []
            });
        }

        // Get user's roles
        var userRoles = await _unitOfWork.UserRoles.GetAllAsync(
            ur => ur.UserId == userIdClaim,
            includes: new[] { "Role" });

        if (userRoles == null || !userRoles.Any())
        {
            return Ok(new BaseResponse<IEnumerable<UserPermissionsDto>>
            {
                StatusCode = 200,
                Message = "No permissions found for the user.",
                Result = []
            });
        }

        // Check if user has SuperAdmin role
        var isSuperAdmin = userRoles.Any(ur => ur.Role.Name == "SuperAdmin");

        List<UserPermissionsDto> permissions;
        HashSet<string> permissionCodes;

        if (isSuperAdmin)
        {
            // SuperAdmin gets all active permissions
            var allPermissions = await _unitOfWork.Permissions.GetAllAsync(
                p => p.IsActive && !p.IsDeleted);

            permissions = allPermissions
                .Select(p => new UserPermissionsDto
                {
                    code = p.Code,
                    name = p.Name
                })
                .OrderBy(p => p.code)
                .ToList();

            permissionCodes = permissions.Select(p => p.code).ToHashSet();
        }
        else
        {
            // Get role IDs
            var roleIds = userRoles.Select(ur => ur.RoleId).ToList();

            // Get permissions for those roles
            var rolePermissions = await _unitOfWork.RolePermissions.GetAllAsync(
                rp => roleIds.Contains(rp.RoleId),
                includes: new[] { "Permission" });

            // Extract unique permissions
            permissions = rolePermissions
                .Where(rp => rp.Permission != null && rp.Permission.IsActive && !rp.Permission.IsDeleted)
                .Select(rp => new UserPermissionsDto
                {
                    code = rp.Permission.Code,
                    name = rp.Permission.Name
                })
                .GroupBy(p => p.code)
                .Select(g => g.First())
                .OrderBy(p => p.code)
                .ToList();

            // Get permission codes for quick lookup
            permissionCodes = permissions.Select(p => p.code).ToHashSet();
        }

        // Define side menu items based on app.routes.ts with descriptive permission codes
        var sideMenuItems = new List<SideMenuPermissionDto>
        {
            // Management Section
            new SideMenuPermissionDto
            {
                code = "ORGANIZATIONS_VIEW",
                route = "/management/organization",
                label = "Organization",
                icon = "business",
                section = "Management",
                hasAccess = isSuperAdmin || permissionCodes.Contains("ORGANIZATIONS_VIEW")
            },
            new SideMenuPermissionDto
            {
                code = "DEPARTMENTS_VIEW",
                route = "/management/department",
                label = "Department",
                icon = "account_balance",
                section = "Management",
                hasAccess = isSuperAdmin || permissionCodes.Contains("DEPARTMENTS_VIEW")
            },
            new SideMenuPermissionDto
            {
                code = "JOB_TITLES_VIEW",
                route = "/management/positions",
                label = "Positions",
                icon = "work",
                section = "Management",
                hasAccess = isSuperAdmin || permissionCodes.Contains("JOB_TITLES_VIEW")
            },
            new SideMenuPermissionDto
            {
                code = "JOB_TITLES_VIEW",
                route = "/management/job-titles",
                label = "Job Titles",
                icon = "badge",
                section = "Management",
                hasAccess = isSuperAdmin || permissionCodes.Contains("JOB_TITLES_VIEW")
            },
            new SideMenuPermissionDto
            {
                code = "LOCATIONS_VIEW",
                route = "/management/location",
                label = "Location",
                icon = "location_on",
                section = "Management",
                hasAccess = isSuperAdmin || permissionCodes.Contains("LOCATIONS_VIEW")
            },
            // User Management Section
            new SideMenuPermissionDto
            {
                code = "USERS_VIEW",
                route = "/management/users",
                label = "Users",
                icon = "people",
                section = "User Management",
                hasAccess = isSuperAdmin || permissionCodes.Contains("USERS_VIEW")
            },
            // Role Management Section
            new SideMenuPermissionDto
            {
                code = "ROLES_VIEW",
                route = "/management/roles",
                label = "Roles",
                icon = "supervisor_account",
                section = "Role Management",
                hasAccess = isSuperAdmin || permissionCodes.Contains("ROLES_VIEW")
            }
        };

        var response = new UserPermissionsResponseDto
        {
            permissions = permissions,
            sideMenu = sideMenuItems
        };

        return Ok(new BaseResponse<UserPermissionsResponseDto>
        {
            StatusCode = 200,
            Message = "Permissions retrieved successfully.",
            Result = response
        });
    }
}
