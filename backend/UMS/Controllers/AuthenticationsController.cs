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
            {
                // Security measure: Return generic error message to prevent user enumeration
                // Don't reveal whether the user exists or not
                return Unauthorized(new BaseResponse<bool> 
                { 
                    StatusCode = 401, 
                    Message = "Invalid credentials.", 
                    Result = false 
                });
            }

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
        else if (user.LoginMethod == LoginMethod.OTPVerification) // OTP Verification
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
            // Security measure: Return fake data to prevent user enumeration
            // Always return Credentials login method for non-existent users
            var isCredentialsEnabled = await _configService.IsLoginMethodEnabledAsync(LoginMethod.Credentials);
            
            // Generate a random fake email to prevent user enumeration
            var random = new Random();
            var randomNumber = random.Next(100000, 999999);
            var fakeEmail = $"user{randomNumber}@gmail.com";
            
            return Ok(new BaseResponse<object>
            {
                StatusCode = 200,
                Message = "Login method retrieved successfully.",
                Result = new
                {
                    loginMethod = new LoginMethodDto
                    {
                        id = (int)LoginMethod.Credentials,
                        name = LoginMethod.Credentials.ToString()
                    },
                    isEnabled = isCredentialsEnabled,
                    email = fakeEmail // Return random fake email for non-existent users
                }
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
        if (user.LoginMethod != LoginMethod.OTPVerification)
        {
            return BadRequest(new BaseResponse<bool> 
            { 
                StatusCode = 400, 
                Message = "OTP verification is not available for this user's login method.", 
                Result = false 
            });
        }

        // Check if OTP login method is enabled
        var isOtpEnabled = await _configService.IsLoginMethodEnabledAsync(LoginMethod.OTPVerification);
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
                emailConfirmed = user.EmailConfirmed,
                departmentId = user.DepartmentId,
                departmentRole = user.DepartmentRole
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

            // Determine login method: use organization's default login method
            var loginMethod = organization.DefaultLoginMethod;
            
            // Validate that the default login method is in the allowed login methods
            if (!string.IsNullOrWhiteSpace(organization.AllowedLoginMethods))
            {
                try
                {
                    var allowedMethods = System.Text.Json.JsonSerializer.Deserialize<List<int>>(organization.AllowedLoginMethods);
                    if (allowedMethods != null && !allowedMethods.Contains((int)loginMethod))
                    {
                        // If default method is not allowed, use the first allowed method or fallback to OTPVerification
                        loginMethod = allowedMethods.Any() 
                            ? (LoginMethod)allowedMethods.First() 
                            : LoginMethod.OTPVerification;
                    }
                }
                catch
                {
                    // If parsing fails, use the default login method as-is
                }
            }
            
            // Create new user with organization's default login method
            // User will be inactive until email is verified via OTP (for all login methods)
            var newUser = new User
            {
                UserName = request.Username,
                Email = request.Email,
                FullName = request.FullName,
                FullNameAr = request.FullNameAr, // Store Arabic name if provided
                ADUsername = string.Empty, // Not used for OTP verification, but required field
                CivilNo = request.CivilNo, // Optional civil number
                LoginMethod = loginMethod, // Use organization's default login method
                OrganizationId = organization.Id,
                IsActive = false, // Inactive until email is verified via OTP (for all login methods)
                IsDeleted = false,
                EmailVerified = false, // Not verified until OTP is confirmed (for all login methods)
                CreatedOn = DateTime.UtcNow,
                CreatedBy = "Registration System",
                FailedLoginAttempts = 0,
                IsLocked = false
            };

            // Create user using UserManager (this handles Identity requirements)
            // Handle different login methods
            IdentityResult result;
            
            if (loginMethod == LoginMethod.Credentials)
            {
                // For Credentials method, generate a temporary password
                var tempPassword = PasswordGenerator.GeneratePassword(12);
                newUser.TemporaryPassword = tempPassword;
                newUser.IsTemporaryPassword = true;
                result = await _userManager.CreateAsync(newUser, tempPassword);
            }
            else if (loginMethod == LoginMethod.ActiveDirectory)
            {
                // For Active Directory, no password needed (will use AD authentication)
                // But Identity requires a password, so we'll create a temporary one that won't be used
                var tempPassword = "TempPass123!@#" + Guid.NewGuid().ToString("N").Substring(0, 10);
                result = await _userManager.CreateAsync(newUser, tempPassword);
            }
            else // OTPVerification (OTP Verification)
            {
                // For OTP verification, we don't need a password, but Identity requires one
                // We'll create a temporary random password that will never be used for OTP users
                // Password must meet Identity requirements: uppercase, lowercase, number, special char, min 6 chars
                var tempPassword = "TempPass123!@#" + Guid.NewGuid().ToString("N").Substring(0, 10);
                result = await _userManager.CreateAsync(newUser, tempPassword);
            }

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

            // Generate and send OTP for email verification (for all login methods)
            string successMessage;
            try
            {
                var userEmail = createdUser.Email ?? request.Email;
                if (!string.IsNullOrWhiteSpace(userEmail))
                {
                    await _otpService.GenerateAndStoreOtpAsync(createdUser.Id, userEmail, createdUser.FullName);
                }
                
                // Success message based on login method
                if (loginMethod == LoginMethod.OTPVerification)
                {
                    successMessage = "Registration successful. An OTP has been sent to your email for verification. Please verify your email to activate your account.";
                }
                else if (loginMethod == LoginMethod.Credentials)
                {
                    successMessage = "Registration successful. An OTP has been sent to your email for verification. Please verify your email to activate your account. After verification, you can log in using your credentials.";
                }
                else // ActiveDirectory
                {
                    successMessage = "Registration successful. An OTP has been sent to your email for verification. Please verify your email to activate your account. After verification, you can log in using your Active Directory credentials.";
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail registration - user can request OTP later
                Console.WriteLine($"Warning: Failed to send OTP email during registration: {ex.Message}");
                successMessage = "Registration successful. However, we couldn't send the verification OTP. Please request a new OTP to activate your account.";
            }

            return Ok(new BaseResponse<bool>
            {
                StatusCode = 200,
                Message = successMessage,
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

    [HttpGet("profile-completion-required")]
    [Authorize]
    public async Task<IActionResult> IsProfileCompletionRequired()
    {
        // Get current user ID from JWT token
        var userIdClaim = User.FindFirst("UserId")?.Value 
                         ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
        {
            return Unauthorized(new BaseResponse<bool>
            {
                StatusCode = 401,
                Message = "User ID not found in token.",
                Result = false
            });
        }

        var user = await _userManager.FindByIdAsync(userIdClaim);
        if (user == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "User not found.",
                Result = false
            });
        }

        // Get user's organization
        var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == user.OrganizationId);
        if (organization == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Organization not found.",
                Result = false
            });
        }

        // Check if user is in main organization and missing required fields
        bool requiresCompletion = false;
        if (organization.IsMain)
        {
            // Check if user is missing department, job title, or full names
            requiresCompletion = user.DepartmentId == null || 
                                user.JobTitleId == null || 
                                string.IsNullOrWhiteSpace(user.FullName) ||
                                string.IsNullOrWhiteSpace(user.FullNameAr);
        }

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Profile completion status retrieved successfully.",
            Result = requiresCompletion
        });
    }

    [HttpPost("complete-profile")]
    [Authorize]
    public async Task<IActionResult> CompleteProfile([FromBody] CompleteProfileRequest request)
    {
        // Get current user ID from JWT token
        var userIdClaim = User.FindFirst("UserId")?.Value 
                         ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                         ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(userIdClaim))
        {
            return Unauthorized(new BaseResponse<bool>
            {
                StatusCode = 401,
                Message = "User ID not found in token.",
                Result = false
            });
        }

        var user = await _userManager.FindByIdAsync(userIdClaim);
        if (user == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "User not found.",
                Result = false
            });
        }

        // Get user's organization
        var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == user.OrganizationId);
        if (organization == null || !organization.IsMain)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Profile completion is only required for main organization users.",
                Result = false
            });
        }

        // Validate required fields
        if (!request.DepartmentId.HasValue || !request.JobTitleId.HasValue)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Department and Job Title are required.",
                Result = false
            });
        }

        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.FullNameAr))
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Full Name (English and Arabic) are required.",
                Result = false
            });
        }

        // Verify department and job title exist
        var department = await _unitOfWork.Departments.FindAsync(d => d.Id == request.DepartmentId.Value && d.OrganizationId == user.OrganizationId);
        if (department == null)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Department not found.",
                Result = false
            });
        }

        var jobTitle = await _unitOfWork.JobTitles.FindAsync(j => j.Id == request.JobTitleId.Value);
        if (jobTitle == null)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Job Title not found.",
                Result = false
            });
        }

        // Update user profile
        user.DepartmentId = request.DepartmentId.Value;
        user.JobTitleId = request.JobTitleId.Value;
        user.FullName = request.FullName.Trim();
        user.FullNameAr = request.FullNameAr.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        user.UpdatedBy = userIdClaim;

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            var errors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
            return StatusCode(500, new BaseResponse<bool>
            {
                StatusCode = 500,
                Message = $"Failed to update profile: {errors}",
                Result = false
            });
        }

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Profile completed successfully.",
            Result = true
        });
    }
}

public class CompleteProfileRequest
{
    public int? DepartmentId { get; set; }
    public int? JobTitleId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string FullNameAr { get; set; } = string.Empty;
}
