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
using UMS.Interfaces;
using System.Linq;
using UMS.Dtos;

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
    private readonly OtpService _otpService;

    public AuthenticationsController(
        LdapAuthenticator ldapAuthenticator, 
        PasswordHasher passwordHasher,
        UserManager<User> userManager,
        SystemConfigurationService configService,
        IUnitOfWork unitOfWork, 
        JwtTokenGenerator jwt, 
        IHostEnvironment env,
        OtpService otpService)
    {
        _ldapAuthenticator = ldapAuthenticator;
        _passwordHasher = passwordHasher;
        _userManager = userManager;
        _configService = configService;
        _unitOfWork = unitOfWork;
        _jwt = jwt;
        _env = env;
        _otpService = otpService;
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
        else if (user.LoginMethod == LoginMethod.KMNID) // OTP Verification
        {
            // OTP Verification - request.Password contains the OTP code
            if (string.IsNullOrWhiteSpace(user.Email))
            {
                return BadRequest(new BaseResponse<bool> 
                { 
                    StatusCode = 400, 
                    Message = "Email is required for OTP verification.", 
                    Result = false 
                });
            }

            // Verify OTP
            isValidCredentials = await _otpService.VerifyOtpAsync(user.Id, request.Password);
            
            if (!isValidCredentials)
            {
                return BadRequest(new BaseResponse<bool> 
                { 
                    StatusCode = 400, 
                    Message = "Invalid or expired OTP code.", 
                    Result = false 
                });
            }
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

    [HttpPost("check-login-method")]
    public async Task<IActionResult> CheckLoginMethod([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username))
        {
            return BadRequest(new BaseResponse<object>
            {
                StatusCode = 400,
                Message = "Username is required.",
                Result = null
            });
        }

        // Find user by username or email
        User? user = await _userManager.FindByEmailAsync(request.Username) 
                     ?? await _userManager.FindByNameAsync(request.Username);
        
        if (user == null)
        {
            var untrackedUser = await _unitOfWork.Users.FindAsync(u => u.ADUsername == request.Username);
            if (untrackedUser != null)
            {
                user = await _userManager.FindByIdAsync(untrackedUser.Id);
            }
        }

        if (user is null)
        {
            return NotFound(new BaseResponse<object>
            {
                StatusCode = 404,
                Message = "User not found.",
                Result = null
            });
        }

        // Check if the login method is enabled in system configuration
        var isLoginMethodEnabled = await _configService.IsLoginMethodEnabledAsync(user.LoginMethod);
        
        return Ok(new BaseResponse<object>
        {
            StatusCode = 200,
            Message = "Login method retrieved successfully.",
            Result = new
            {
                loginMethod = new LoginMethodDto
                {
                    id = (int)user.LoginMethod,
                    name = user.LoginMethod.ToString()
                },
                isEnabled = isLoginMethodEnabled,
                email = user.Email
            }
        });
    }

    [HttpPost("request-otp")]
    public async Task<IActionResult> RequestOtp([FromBody] LoginRequest request)
    {
        // Find user by username or email
        User? user = await _userManager.FindByEmailAsync(request.Username) 
                     ?? await _userManager.FindByNameAsync(request.Username);
        
        if (user == null)
        {
            var untrackedUser = await _unitOfWork.Users.FindAsync(u => u.ADUsername == request.Username);
            if (untrackedUser != null)
            {
                user = await _userManager.FindByIdAsync(untrackedUser.Id);
            }
        }

        if (user is null)
        {
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "User not found.", Result = false });
        }

        // Check if user has OTP login method
        if (user.LoginMethod != LoginMethod.KMNID)
        {
            return BadRequest(new BaseResponse<bool> 
            { 
                StatusCode = 400, 
                Message = "OTP verification is not available for this user's login method.", 
                Result = false 
            });
        }

        // Check if OTP login method is enabled
        var isOtpEnabled = await _configService.IsLoginMethodEnabledAsync(LoginMethod.KMNID);
        if (!isOtpEnabled)
        {
            return BadRequest(new BaseResponse<bool> 
            { 
                StatusCode = 400, 
                Message = "OTP verification is not enabled in system configuration.", 
                Result = false 
            });
        }

        if (string.IsNullOrWhiteSpace(user.Email))
        {
            return BadRequest(new BaseResponse<bool> 
            { 
                StatusCode = 400, 
                Message = "Email is required for OTP verification.", 
                Result = false 
            });
        }

        // Generate and send OTP (email is sent automatically in GenerateAndStoreOtpAsync)
        var otp = await _otpService.GenerateAndStoreOtpAsync(user.Id, user.Email, user.FullName);

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "OTP has been sent to your email address.",
            Result = true
        });
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

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegistrationRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "Email is required.",
                    Result = false
                });
            }

            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "Full name (English) is required.",
                    Result = false
                });
            }

            if (string.IsNullOrWhiteSpace(request.Username))
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "Username is required.",
                    Result = false
                });
            }

            // Check if user already exists
            var existingUser = await _userManager.FindByEmailAsync(request.Email)
                             ?? await _userManager.FindByNameAsync(request.Username);
            
            if (existingUser != null)
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "A user with this email or username already exists.",
                    Result = false
                });
            }

            // Extract domain from email
            var emailParts = request.Email.Split('@');
            if (emailParts.Length != 2)
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "Invalid email format.",
                    Result = false
                });
            }

            var emailDomain = emailParts[1].ToLower();

            // Find organization by domain
            var organization = await _unitOfWork.Organizations.FindAsync(
                o => !o.IsDeleted && o.Domain.ToLower() == emailDomain
            );

            if (organization == null)
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = $"No organization found for email domain '{emailDomain}'. Please contact your administrator.",
                    Result = false
                });
            }

            // Check if organization is active
            if (!organization.IsActive)
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "The organization associated with your email domain is not active.",
                    Result = false
                });
            }

            // Create new user with OTP Verification as default login method
            // User will be inactive until OTP is verified
            var newUser = new User
            {
                UserName = request.Username,
                Email = request.Email,
                FullName = request.FullName,
                ADUsername = string.Empty, // Not used for OTP verification, but required field
                CivilNo = request.CivilNo, // Optional civil number
                LoginMethod = LoginMethod.KMNID, // OTP Verification
                OrganizationId = organization.Id,
                IsActive = false, // User will be activated after OTP verification
                IsDeleted = false,
                EmailVerified = false, // Will be verified after OTP confirmation
                CreatedOn = DateTime.UtcNow,
                CreatedBy = "Registration System",
                FailedLoginAttempts = 0,
                IsLocked = false
            };
            
            // Note: FullNameAr is not currently stored in User model
            // If needed, it can be added to the User model in a future migration

            // Create user using UserManager (this handles Identity requirements)
            // For OTP verification, we don't need a password, but Identity requires one
            // We'll create a temporary random password that will never be used for OTP users
            // Password must meet Identity requirements: uppercase, lowercase, number, special char, min 6 chars
            var tempPassword = "TempPass123!@#" + Guid.NewGuid().ToString("N").Substring(0, 10);
            var result = await _userManager.CreateAsync(newUser, tempPassword);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = $"Failed to create user: {errors}",
                    Result = false
                });
            }

            // Reload user to get the generated ID
            var createdUser = await _userManager.FindByEmailAsync(request.Email);
            if (createdUser == null)
            {
                return StatusCode(500, new BaseResponse<bool>
                {
                    StatusCode = 500,
                    Message = "User was created but could not be retrieved.",
                    Result = false
                });
            }

            // Find and assign default role for the organization
            // Priority: 1) Organization-specific default role, 2) Global default role (ApplyToAllOrganizations)
            // First try to find organization-specific default role
            var defaultRole = await _unitOfWork.Roles.FindAsync(
                r => !r.IsDeleted && 
                     r.IsDefault && 
                     r.IsActive &&
                     r.OrganizationId == organization.Id
            );
            
            // If no organization-specific default role, try global default role
            if (defaultRole == null)
            {
                defaultRole = await _unitOfWork.Roles.FindAsync(
                    r => !r.IsDeleted && 
                         r.IsDefault && 
                         r.IsActive &&
                         r.ApplyToAllOrganizations &&
                         (!r.OrganizationId.HasValue || r.OrganizationId == null)
                );
            }

            if (defaultRole != null)
            {
                var userRole = new UserRole
                {
                    UserId = createdUser.Id,
                    RoleId = defaultRole.Id
                };
                await _unitOfWork.UserRoles.AddAsync(userRole);
                await _unitOfWork.CompleteAsync();
            }

            // Generate and send OTP for email verification
            try
            {
                var userEmail = createdUser.Email ?? request.Email;
                if (!string.IsNullOrWhiteSpace(userEmail))
                {
                    await _otpService.GenerateAndStoreOtpAsync(createdUser.Id, userEmail, createdUser.FullName);
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail registration - user can request OTP later
                Console.WriteLine($"Warning: Failed to send OTP email during registration: {ex.Message}");
            }

            return Ok(new BaseResponse<bool>
            {
                StatusCode = 200,
                Message = "Registration successful. An OTP has been sent to your email for verification. Please verify your email to activate your account.",
                Result = true
            });
        }
        catch (Exception ex)
        {
            // Log the full exception details for debugging
            var errorMessage = ex.Message;
            if (ex.InnerException != null)
            {
                errorMessage += $" Inner Exception: {ex.InnerException.Message}";
            }
            
            // Check if it's a database constraint violation
            if (ex.InnerException != null && ex.InnerException.Message.Contains("FOREIGN KEY"))
            {
                errorMessage = "Database constraint violation. Please ensure all required relationships are valid.";
            }
            else if (ex.InnerException != null && ex.InnerException.Message.Contains("UNIQUE"))
            {
                errorMessage = "A user with this email or username already exists.";
            }
            
            return StatusCode(500, new BaseResponse<bool>
            {
                StatusCode = 500,
                Message = $"Error during registration: {errorMessage}",
                Result = false
            });
        }
    }

    [HttpPost("verify-registration-otp")]
    public async Task<IActionResult> VerifyRegistrationOtp([FromBody] VerifyRegistrationOtpRequest request)
    {
        try
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(request.Email))
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "Email is required.",
                    Result = false
                });
            }

            if (string.IsNullOrWhiteSpace(request.Otp))
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "OTP code is required.",
                    Result = false
                });
            }

            // Find user by email
            var user = await _userManager.FindByEmailAsync(request.Email);
            if (user == null)
            {
                return NotFound(new BaseResponse<bool>
                {
                    StatusCode = 404,
                    Message = "User not found.",
                    Result = false
                });
            }

            // Check if user is already verified
            if (user.EmailVerified && user.IsActive)
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "Your account is already verified and active.",
                    Result = false
                });
            }

            // Verify OTP
            var isValidOtp = await _otpService.VerifyOtpAsync(user.Id, request.Otp);
            if (!isValidOtp)
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "Invalid or expired OTP code.",
                    Result = false
                });
            }

            // Activate user and mark email as verified
            user.EmailVerified = true;
            user.IsActive = true;
            user.UpdatedAt = DateTime.UtcNow;
            user.UpdatedBy = "OTP Verification System";

            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                var errors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
                return StatusCode(500, new BaseResponse<bool>
                {
                    StatusCode = 500,
                    Message = $"Failed to activate user: {errors}",
                    Result = false
                });
            }

            return Ok(new BaseResponse<bool>
            {
                StatusCode = 200,
                Message = "Email verified successfully. Your account has been activated.",
                Result = true
            });
        }
        catch (Exception ex)
        {
            var errorMessage = ex.Message;
            if (ex.InnerException != null)
            {
                errorMessage += $" Inner Exception: {ex.InnerException.Message}";
            }

            return StatusCode(500, new BaseResponse<bool>
            {
                StatusCode = 500,
                Message = $"Error during OTP verification: {errorMessage}",
                Result = false
            });
        }
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
            },
            // System Administration Section
            new SideMenuPermissionDto
            {
                code = "SYSTEM_CONFIG_VIEW",
                route = "/management/system-configuration",
                label = "System Configuration",
                icon = "settings",
                section = "System Administration",
                hasAccess = isSuperAdmin || permissionCodes.Contains("SYSTEM_CONFIG_VIEW")
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
