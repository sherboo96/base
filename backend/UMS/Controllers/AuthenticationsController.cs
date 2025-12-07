using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
    private readonly IUnitOfWork _unitOfWork;
    private readonly JwtTokenGenerator _jwt;
    private readonly IHostEnvironment _env;

    public AuthenticationsController(LdapAuthenticator ldapAuthenticator, IUnitOfWork unitOfWork, JwtTokenGenerator jwt, IHostEnvironment env)
    {
        _ldapAuthenticator = ldapAuthenticator;
        _unitOfWork = unitOfWork;
        _jwt = jwt;
        _env = env;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        User? user = null;

        // Development mode - bypass authentication
        if (_env.IsDevelopment())
        {
            user = await _unitOfWork.Users.FindAsync(u => u.ADUsername == request.Username || u.Email == request.Username, new[] { "JobTitle", "UserRoles", "UserRoles.Role" });
            if (user is null)
                return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "User not registered.", Result = false });

            return await ProcessSuccessfulLogin(user);
        }

        // Active Directory authentication
        if (request.Username.StartsWith("Test"))
        {
            // Test users bypass AD
            user = await _unitOfWork.Users.FindAsync(u => u.ADUsername == request.Username, new[] { "JobTitle", "UserRoles", "UserRoles.Role" });
            if (user is null)
                return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "User not registered.", Result = false });

            return await ProcessSuccessfulLogin(user);
        }

        var adUser = _ldapAuthenticator.GetUserFromDomain(request.Username);
        if (adUser is null)
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "User not found in Active Directory.", Result = false });

        user = await _unitOfWork.Users.FindAsync(u => u.Email == adUser.Username || u.ADUsername == adUser.Username, new[] { "JobTitle", "UserRoles", "UserRoles.Role" });
        if (user is null)
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "User not registered.", Result = false });

        // Validate credentials via AD
        if (!_ldapAuthenticator.ValidateCredentials(request.Username, request.Password))
        {
            // Get a fresh instance to avoid tracking conflicts
            var userToUpdate = await _unitOfWork.Users.FindAsync(u => u.Id == user.Id);
            if (userToUpdate != null)
            {
                userToUpdate.FailedLoginAttempts += 1;
                userToUpdate.IsLocked = userToUpdate.FailedLoginAttempts > 1;
                userToUpdate.UpdatedAt = DateTime.UtcNow;
                userToUpdate.UpdatedBy = "Login System";
                await _unitOfWork.Users.UpdateAsync(userToUpdate);
                await _unitOfWork.CompleteAsync();
            }
            return Unauthorized(new BaseResponse<bool> { StatusCode = 401, Message = "Invalid credentials.", Result = false });
        }

        // Common validation
        if (user.IsLocked)
            return StatusCode(403, new BaseResponse<bool>
            {
                StatusCode = 403,
                Message = "Your account is locked due to multiple failed login attempts. Please contact the system administrator to restore access.",
                Result = false
            });

        if (!user.IsActive)
            return StatusCode(403, new BaseResponse<bool>
            {
                StatusCode = 403,
                Message = "Your account is disabled. Please contact the system administrator to activate it.",
                Result = false
            });

        return await ProcessSuccessfulLogin(user);
    }

    private async Task<IActionResult> ProcessSuccessfulLogin(User user)
    {
        // Get user's first role (if any)
        var userRoles = await _unitOfWork.UserRoles.GetAllAsync(ur => ur.UserId == user.Id, new[] { "Role" });
        var firstRole = userRoles.FirstOrDefault();
        var roleId = firstRole?.RoleId;

        var token = _jwt.GenerateToken(user.Id, user.FullName, null, "", roleId);

        // Update only the User entity without related entities to avoid tracking conflicts
        var userToUpdate = await _unitOfWork.Users.FindAsync(u => u.Id == user.Id);
        if (userToUpdate != null)
        {
            userToUpdate.FailedLoginAttempts = 0;
            userToUpdate.LastLogin = DateTime.Now;
            userToUpdate.UpdatedBy = user.FullName;
            userToUpdate.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Users.UpdateAsync(userToUpdate);
            await _unitOfWork.CompleteAsync();
        }

        return Ok(new BaseResponse<object>
        {
            StatusCode = 200,
            Message = "Login successful.",
            Result = new
            {
                Token = token,
                User = user,
                Roles = userRoles.Select(ur => ur.Role).ToList()
            }
        });
    }
}
