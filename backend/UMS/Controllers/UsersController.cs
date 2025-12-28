using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using UMS.Services;
using UMS.Models;
using Microsoft.AspNetCore.Authorization;
using Azure.Core;
using Microsoft.AspNetCore.Identity;
using System.Linq;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class UsersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly LdapAuthenticator _ldapAuthenticator;
    private readonly UserManager<User> _userManager;
    private readonly OrganizationAccessService _orgAccessService;


    public UsersController(IUnitOfWork unitOfWork, LdapAuthenticator ldapAuthenticator, UserManager<User> userManager, OrganizationAccessService orgAccessService)
    {
        _ldapAuthenticator = ldapAuthenticator; 
        _unitOfWork = unitOfWork;
        _userManager = userManager;
        _orgAccessService = orgAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] string? search = null,
    [FromQuery] int? organization = null,
    [FromQuery] int? department = null,
    [FromQuery] int? role = null)
    {
        var skip = (page - 1) * pageSize;

        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        
        // Use provided organization filter or apply user's organization restriction
        var effectiveOrgFilter = organization ?? orgFilter;

        // Build search filter
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? search.ToLower().Trim() : "";

        // If role filter is provided, get user IDs with that role first
        List<string> userIdsWithRole = null;
        if (role.HasValue)
        {
            var usersWithRole = await _unitOfWork.UserRoles.GetAllAsync(
                match: ur => ur.RoleId == role.Value
            );
            userIdsWithRole = usersWithRole.Select(ur => ur.UserId).ToList();
        }

        // Build filter expression
        var hasRoleFilter = role.HasValue && userIdsWithRole != null && userIdsWithRole.Any();
        Expression<Func<User, bool>> filter = user => 
            !user.IsDeleted &&
            (!effectiveOrgFilter.HasValue || user.OrganizationId == effectiveOrgFilter.Value) &&
            (!department.HasValue || user.DepartmentId == department.Value) &&
            (!hasSearch ||
             (user.FullName != null && user.FullName.ToLower().Contains(searchLower)) ||
             (user.Email != null && user.Email.ToLower().Contains(searchLower)) ||
             (user.UserName != null && user.UserName.ToLower().Contains(searchLower)) ||
             (user.ADUsername != null && user.ADUsername.ToLower().Contains(searchLower)) ||
             (user.CivilNo != null && user.CivilNo.ToLower().Contains(searchLower))) &&
            (!hasRoleFilter || userIdsWithRole.Contains(user.Id));

        var total = await _unitOfWork.Users.CountAsync(filter);
        var data = await _unitOfWork.Users.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            new[] { "JobTitle", "Organization", "Department" }
        );

        // Map User entities to UserResponseDto to exclude sensitive fields
        var responseData = data.Select(UserResponseDto.FromUser);

        return Ok(new BaseResponse<IEnumerable<UserResponseDto>>
        {
            StatusCode = 200,
            Message = "Users retrieved successfully.",
            Result = responseData,
            Total = total,
            Pagination = new Pagination
            {
                CurrentPage = page,
                PageSize = pageSize,
                Total = total
            }
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var item = await _unitOfWork.Users.FindAsync(x => x.Id == id, new[] { "JobTitle", "Organization", "Department" });
        return item == null
            ? NotFound(new BaseResponse<UserResponseDto> { StatusCode = 404, Message = "User not found." })
            : Ok(new BaseResponse<UserResponseDto> { StatusCode = 200, Message = "User retrieved successfully.", Result = UserResponseDto.FromUser(item) });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserDto dto)
    {
        // Check for duplicate users - only check ADUsername if it's provided
        User? user = null;
        if (!string.IsNullOrWhiteSpace(dto.ADUsername))
        {
            user = await _unitOfWork.Users.FindAsync(u => u.Email == dto.Email || u.ADUsername == dto.ADUsername || u.Email == dto.ADUsername);
        }
        else
        {
            user = await _unitOfWork.Users.FindAsync(u => u.Email == dto.Email);
        }

        if (user is not null)
        {
            return StatusCode(400, new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "This user already has an account.",
                Result = false
            });
        }

        // Create new user based on login method
        var newUser = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            UserName = !string.IsNullOrWhiteSpace(dto.Username) ? dto.Username : dto.Email, // Use provided username or default to email
            ADUsername = dto.ADUsername ?? string.Empty, // Allow null for Credentials method
            CivilNo = dto.CivilNo,
            JobTitleId = dto.JobTitleId,
            OrganizationId = dto.OrganizationId,
            DepartmentId = dto.DepartmentId,
            DepartmentRole = dto.DepartmentRole,
            LoginMethod = dto.LoginMethod,
            EmailVerified = false,
            IsActive = true,
            CreatedOn = DateTime.Now
        };

        // Handle different login methods
        if (dto.LoginMethod == LoginMethod.Credentials)
        {
            // Get organization code for password generation
            var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == dto.OrganizationId);
            string orgCode = organization?.Code ?? "MOO"; // Default to MOO if organization not found
            
            // Generate temporary password if not provided
            string tempPassword = !string.IsNullOrEmpty(dto.TemporaryPassword) 
                ? dto.TemporaryPassword 
                : PasswordGenerator.GeneratePassword(orgCode);
            
            newUser.TemporaryPassword = tempPassword;
            newUser.IsTemporaryPassword = true;
            
            // Create user with password in Identity system
            var result = await _userManager.CreateAsync(newUser, tempPassword);
            
            if (!result.Succeeded)
            {
                return StatusCode(400, new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description)),
                    Result = false
                });
            }
        }
        else if (dto.LoginMethod == LoginMethod.ActiveDirectory)
        {
            // ADUsername is required for Active Directory login method
            if (string.IsNullOrWhiteSpace(dto.ADUsername))
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "AD Username is required for Active Directory login method.",
                    Result = false
                });
            }
            
            // Verify user exists in Active Directory
            bool existsInAD = _ldapAuthenticator.IsUsernameInDomain(dto.ADUsername);
            
            if (!existsInAD)
            {
                return NotFound(new BaseResponse<bool>
                {
                    StatusCode = 404,
                    Message = "User not found in Active Directory. Please verify the AD username.",
                    Result = false
                });
            }
            
            // Create user without password (will use AD authentication)
            var result = await _userManager.CreateAsync(newUser);
            
            if (!result.Succeeded)
            {
                return StatusCode(400, new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description)),
                    Result = false
                });
            }
        }
        else if (dto.LoginMethod == LoginMethod.OTPVerification)
        {
            // For OTP Verification, email verification will be required
            newUser.EmailVerified = false;
            
            // Create user without password (will use OTP authentication)
            var result = await _userManager.CreateAsync(newUser);
            
            if (!result.Succeeded)
            {
                return StatusCode(400, new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = string.Join(", ", result.Errors.Select(e => e.Description)),
                    Result = false
                });
            }
            
            // TODO: Send verification email with OTP
        }

        // Assign roles if provided
        if (dto.RoleIds != null && dto.RoleIds.Any())
        {
            foreach (var roleId in dto.RoleIds)
            {
                var role = await _unitOfWork.Roles.FindAsync(r => r.Id == roleId);
                if (role != null)
                {
                    var userRole = new UserRole
                    {
                        UserId = newUser.Id,
                        RoleId = roleId
                    };
                    await _unitOfWork.UserRoles.AddAsync(userRole);
                }
            }
            await _unitOfWork.CompleteAsync();
        }

        var createdUser = await _unitOfWork.Users.FindAsync(x => x.Id == newUser.Id, new[] { "JobTitle", "Organization", "Department" });
        
        // Return response with temporary password for Credentials method
        var response = new BaseResponse<object>
        {
            StatusCode = 201,
            Message = "User created successfully.",
            Result = new
            {
                User = UserResponseDto.FromUser(createdUser),
                TemporaryPassword = dto.LoginMethod == LoginMethod.Credentials ? newUser.TemporaryPassword : null
            }
        };
        
        return CreatedAtAction(nameof(GetById), new { id = newUser.Id }, response);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UserDto dto)
    {
        // Use UserManager to find user to avoid tracking conflicts
        var existing = await _userManager.FindByIdAsync(id);
        if (existing == null || existing.IsDeleted)
            return NotFound(new BaseResponse<User> { StatusCode = 404, Message = "User not found." });

        // Check if email/ADUsername is being changed and already exists for another user
        if (dto.Email != existing.Email || dto.ADUsername != existing.ADUsername)
        {
            var duplicateUser = await _unitOfWork.Users.FindAsync(u => 
                u.Id != id && 
                (u.Email == dto.Email || u.ADUsername == dto.ADUsername || u.Email == dto.ADUsername || u.ADUsername == dto.Email));
            
            if (duplicateUser != null)
            {
                return StatusCode(400, new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "This email or AD username is already associated with another user.",
                    Result = false
                });
            }
        }

        // Update user properties
        existing.FullName = dto.FullName;
        existing.Email = dto.Email;
        existing.UserName = !string.IsNullOrWhiteSpace(dto.Username) ? dto.Username : dto.Email; // Update username if provided
        existing.ADUsername = dto.ADUsername ?? string.Empty; // Allow null for Credentials method
        existing.CivilNo = dto.CivilNo;
        existing.JobTitleId = dto.JobTitleId;
        existing.OrganizationId = dto.OrganizationId;
        existing.DepartmentId = dto.DepartmentId;
        existing.DepartmentRole = dto.DepartmentRole;
        existing.LoginMethod = dto.LoginMethod;
        existing.EmailVerified = dto.EmailVerified;
        existing.UpdatedAt = DateTime.Now;
        
        // Handle password update for Credentials method
        if (dto.LoginMethod == LoginMethod.Credentials && !string.IsNullOrEmpty(dto.TemporaryPassword))
        {
            existing.TemporaryPassword = dto.TemporaryPassword;
            existing.IsTemporaryPassword = true;
            
            // Check if user has a password before trying to remove it
            var hasPassword = await _userManager.HasPasswordAsync(existing);
            if (hasPassword)
            {
                await _userManager.RemovePasswordAsync(existing);
            }
            await _userManager.AddPasswordAsync(existing, dto.TemporaryPassword);
        }

        // Update user using UserManager (handles Identity-specific updates)
        var updateResult = await _userManager.UpdateAsync(existing);
        if (!updateResult.Succeeded)
        {
            return StatusCode(400, new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = string.Join(", ", updateResult.Errors.Select(e => e.Description)),
                Result = false
            });
        }

        // Update user roles if provided
        if (dto.RoleIds != null)
        {
            // Get existing user roles
            var existingUserRoles = await _unitOfWork.UserRoles.GetAllAsync(ur => ur.UserId == id);
            var existingRoleIds = existingUserRoles.Select(ur => ur.RoleId).ToList();
            var newRoleIds = dto.RoleIds.ToList();

            // Find roles to remove (exist in DB but not in new list)
            var rolesToRemove = existingUserRoles.Where(ur => !newRoleIds.Contains(ur.RoleId)).ToList();
            foreach (var userRole in rolesToRemove)
            {
                await _unitOfWork.UserRoles.DeleteAsync(userRole);
            }

            // Find roles to add (in new list but not in DB)
            var rolesToAdd = newRoleIds.Where(roleId => !existingRoleIds.Contains(roleId)).ToList();
            foreach (var roleId in rolesToAdd)
            {
                var role = await _unitOfWork.Roles.FindAsync(r => r.Id == roleId);
                if (role != null)
                {
                    var userRole = new UserRole
                    {
                        UserId = id,
                        RoleId = roleId
                    };
                    await _unitOfWork.UserRoles.AddAsync(userRole);
                }
            }

            // Save changes
            await _unitOfWork.CompleteAsync();
        }
        
        // Fetch updated user with relationships for response
        var updatedUser = await _unitOfWork.Users.FindAsync(x => x.Id == id, new[] { "JobTitle", "Organization", "Department" });
        return Ok(new BaseResponse<UserResponseDto> { StatusCode = 200, Message = "User updated successfully.", Result = UserResponseDto.FromUser(updatedUser) });
    }

    [HttpPatch("{id}/Unlock")]
    public async Task<IActionResult> Unlock(string id)
    {
        var existing = await _unitOfWork.Users.FindAsync(x => x.Id == id);
        if (existing == null) return NotFound(new BaseResponse<User> { StatusCode = 404, Message = "User not found." });
        existing.IsLocked = false;
        existing.FailedLoginAttempts = 0;
        var updated = await _unitOfWork.Users.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "User is unlocked successfully.", Result = true });
    }

    [HttpPatch("{id}/Toggle")]
    public async Task<IActionResult> Disabled(string id)
    {
        var existing = await _unitOfWork.Users.FindAsync(x => x.Id == id);
        if (existing == null) return NotFound(new BaseResponse<User> { StatusCode = 404, Message = "User not found." });
        existing.IsActive = !existing.IsActive;
        var updated = await _unitOfWork.Users.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        var message = existing.IsActive ? "is active" : "is disabled";
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = $"User is {message} successfully.", Result = true });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var existing = await _unitOfWork.Users.FindAsync(x => x.Id == id);
        if (existing == null) return NotFound(new BaseResponse<User> { StatusCode = 404, Message = "User not found." });
        existing.IsDeleted = true;
        await _unitOfWork.Users.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "User deleted successfully.", Result = true });
    }

    [HttpGet("ad-user/{username}")]
    public IActionResult GetUserFromAD(string username)
    {
        var user = _ldapAuthenticator.GetUserFromDomain(username);
        if (user == null)
        {
            return NotFound(new BaseResponse<object>
            {
                StatusCode = 404,
                Message = "User not found in Active Directory"
            });
        }

        return Ok(new BaseResponse<AdUserModel>
        {
            StatusCode = 200,
            Message = "User found in Active Directory",
            Result = user
        });
    }

    [HttpGet("ad-user/check/{username}")]
    public IActionResult CheckUserExists(string username)
    {
        bool exists = _ldapAuthenticator.IsUsernameInDomain(username);
        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = exists ? "User exists in Active Directory" : "User not found in Active Directory",
            Result = exists
        });
    }

    [HttpGet("{userId}/permissions")]
    public async Task<IActionResult> GetUserPermissions(string userId)
    {
        var userRoles = await _unitOfWork.UserRoles.GetAllAsync(
            ur => ur.UserId == userId,
            includes: new[] { "Role" });

        if (userRoles == null || !userRoles.Any())
        {
            return NotFound(new BaseResponse<IEnumerable<string>>
            {
                StatusCode = 404,
                Message = "No roles found for the user.",
                Result = []
            });
        }

        var roleIds = userRoles.Select(ur => ur.RoleId).ToList();

        var rolePermissions = await _unitOfWork.RolePermissions.GetAllAsync(
            rp => roleIds.Contains(rp.RoleId),
            includes: new[] { "Permission" });

        var permissions = rolePermissions
            .Where(rp => rp.Permission != null)
            .Select(rp => new
            {
                Code = rp.Permission.Code,
                Name = rp.Permission.Name
            })
            .Distinct()
            .ToList();

        return Ok(new BaseResponse<IEnumerable<object>>
        {
            StatusCode = 200,
            Message = "Permissions retrieved successfully.",
            Result = permissions
        });
    }

    [HttpGet("{id}/password")]
    public async Task<IActionResult> GetUserPassword(string id)
    {
        var user = await _unitOfWork.Users.FindAsync(x => x.Id == id);
        if (user == null || user.IsDeleted)
            return NotFound(new BaseResponse<string> { StatusCode = 404, Message = "User not found." });

        // Only return password if it's a temporary password (Credentials login method)
        if (user.LoginMethod == LoginMethod.Credentials && !string.IsNullOrEmpty(user.TemporaryPassword))
        {
            return Ok(new BaseResponse<string>
            {
                StatusCode = 200,
                Message = "Password retrieved successfully.",
                Result = user.TemporaryPassword
            });
        }

        return BadRequest(new BaseResponse<string>
        {
            StatusCode = 400,
            Message = "Password is not available for this user's login method.",
            Result = null
        });
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadUsers([FromBody] BulkUserUploadRequest request)
    {
        if (request.Users == null || request.Users.Count == 0)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "No users provided for upload.",
                Result = false
            });
        }

        var results = new List<BulkUserUploadResult>();
        int successCount = 0;
        int failureCount = 0;

        foreach (var userDto in request.Users)
        {
            var result = new BulkUserUploadResult
            {
                Email = userDto.Email,
                FullName = userDto.FullName,
                Success = false
            };

            try
            {
                // Check for duplicate users
                User? existingUser = null;
                if (!string.IsNullOrWhiteSpace(userDto.ADUsername))
                {
                    existingUser = await _unitOfWork.Users.FindAsync(u => u.Email == userDto.Email || u.ADUsername == userDto.ADUsername || u.Email == userDto.ADUsername);
                }
                else
                {
                    existingUser = await _unitOfWork.Users.FindAsync(u => u.Email == userDto.Email);
                }

                if (existingUser != null)
                {
                    result.Message = "User already exists.";
                    results.Add(result);
                    failureCount++;
                    continue;
                }

                // Create new user
                var newUser = new User
                {
                    FullName = userDto.FullName,
                    Email = userDto.Email,
                    UserName = !string.IsNullOrWhiteSpace(userDto.Username) ? userDto.Username : userDto.Email,
                    ADUsername = userDto.ADUsername ?? string.Empty,
                    CivilNo = userDto.CivilNo,
                    OrganizationId = userDto.OrganizationId,
                    LoginMethod = (LoginMethod)userDto.LoginMethod,
                    EmailVerified = false,
                    IsActive = true,
                    CreatedOn = DateTime.UtcNow
                };

                // Handle different login methods
                if (userDto.LoginMethod == (int)LoginMethod.Credentials)
                {
                    // Get organization code for password generation
                    var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == userDto.OrganizationId);
                    string orgCode = organization?.Code ?? "MOO"; // Default to MOO if organization not found
                    
                    string tempPassword = PasswordGenerator.GeneratePassword(orgCode);
                    newUser.TemporaryPassword = tempPassword;
                    newUser.IsTemporaryPassword = true;
                    
                    var createResult = await _userManager.CreateAsync(newUser, tempPassword);
                    
                    if (!createResult.Succeeded)
                    {
                        result.Message = string.Join(", ", createResult.Errors.Select(e => e.Description));
                        results.Add(result);
                        failureCount++;
                        continue;
                    }
                }
                else if (userDto.LoginMethod == (int)LoginMethod.ActiveDirectory)
                {
                    if (string.IsNullOrWhiteSpace(userDto.ADUsername))
                    {
                        result.Message = "AD Username is required for Active Directory login method.";
                        results.Add(result);
                        failureCount++;
                        continue;
                    }
                    
                    // Verify user exists in Active Directory
                    bool existsInAD = _ldapAuthenticator.IsUsernameInDomain(userDto.ADUsername);
                    
                    if (!existsInAD)
                    {
                        result.Message = "User not found in Active Directory.";
                        results.Add(result);
                        failureCount++;
                        continue;
                    }
                    
                    var createResult = await _userManager.CreateAsync(newUser);
                    
                    if (!createResult.Succeeded)
                    {
                        result.Message = string.Join(", ", createResult.Errors.Select(e => e.Description));
                        results.Add(result);
                        failureCount++;
                        continue;
                    }
                }
                else // OTPVerification
                {
                    var createResult = await _userManager.CreateAsync(newUser);
                    
                    if (!createResult.Succeeded)
                    {
                        result.Message = string.Join(", ", createResult.Errors.Select(e => e.Description));
                        results.Add(result);
                        failureCount++;
                        continue;
                    }
                }

                // User is already saved by UserManager.CreateAsync, just complete the transaction
                await _unitOfWork.CompleteAsync();

                result.Success = true;
                result.Message = "User created successfully.";
                results.Add(result);
                successCount++;
            }
            catch (Exception ex)
            {
                result.Message = $"Error: {ex.Message}";
                results.Add(result);
                failureCount++;
            }
        }

        return Ok(new BaseResponse<BulkUserUploadResponse>
        {
            StatusCode = 200,
            Message = $"Upload completed. {successCount} succeeded, {failureCount} failed.",
            Result = new BulkUserUploadResponse
            {
                Total = request.Users.Count,
                SuccessCount = successCount,
                FailureCount = failureCount,
                Results = results
            }
        });
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetPassword(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null || user.IsDeleted)
            return NotFound(new BaseResponse<object> { StatusCode = 404, Message = "User not found." });

        // Only reset password for Credentials login method
        if (user.LoginMethod != LoginMethod.Credentials)
        {
            return BadRequest(new BaseResponse<object>
            {
                StatusCode = 400,
                Message = "Password reset is only available for Credentials login method.",
                Result = null
            });
        }

        // Get organization code for password generation
        var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == user.OrganizationId);
        string orgCode = organization?.Code ?? "MOO"; // Default to MOO if organization not found

        // Generate new temporary password
        string newPassword = PasswordGenerator.GeneratePassword(orgCode);
        user.TemporaryPassword = newPassword;
        user.IsTemporaryPassword = true;

        // Update password in Identity system
        var hasPassword = await _userManager.HasPasswordAsync(user);
        if (hasPassword)
        {
            await _userManager.RemovePasswordAsync(user);
        }
        await _userManager.AddPasswordAsync(user, newPassword);

        // Update user
        await _userManager.UpdateAsync(user);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<object>
        {
            StatusCode = 200,
            Message = "Password reset successfully.",
            Result = new { TemporaryPassword = newPassword }
        });
    }
}
