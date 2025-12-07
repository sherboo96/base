using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using UMS.Services;
using UMS.Models;
using Microsoft.AspNetCore.Authorization;
using Azure.Core;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class UsersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly LdapAuthenticator _ldapAuthenticator;


    public UsersController(IUnitOfWork unitOfWork, LdapAuthenticator ldapAuthenticator)
    {
        _ldapAuthenticator = ldapAuthenticator; 
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
    [FromQuery] int page = 1,
    [FromQuery] int pageSize = 10,
    [FromQuery] int? orgnization = null,
    [FromQuery] int? department = null)
    {
        var skip = (page - 1) * pageSize;

        Expression<Func<User, bool>> filter = user => !user.IsDeleted;

        var total = await _unitOfWork.Users.CountAsync(filter);
        var data = await _unitOfWork.Users.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            new[] { "JobTitle" }
        );

        return Ok(new BaseResponse<IEnumerable<User>>
        {
            StatusCode = 200,
            Message = "Users retrieved successfully.",
            Result = data,
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
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Users.FindAsync(x => x.Id == id, new[] { "JobTitle", "DepartmentUsers", "DepartmentUsers.Department", "DepartmentUsers.Department.Organization" });
        return item == null
            ? NotFound(new BaseResponse<User> { StatusCode = 404, Message = "User not found." })
            : Ok(new BaseResponse<User> { StatusCode = 200, Message = "User retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserDto dto)
    {
        var user = await _unitOfWork.Users.FindAsync(u => u.Email == dto.ADUsername || u.ADUsername == dto.ADUsername);

        if (user is not null)
        {
            return StatusCode(400, new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "This user is already has an account.",
                Result = false
            });
        }

        var entity = await _unitOfWork.Users.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        var createdUser = await _unitOfWork.Users.FindAsync(x => x.Id == ((User)entity).Id, new[] { "JobTitle", "DepartmentUsers", "DepartmentUsers.Department", "DepartmentUsers.Department.Organization" });
        return CreatedAtAction(nameof(GetById), new { id = ((User)entity).Id }, new BaseResponse<User> { StatusCode = 201, Message = "User created successfully.", Result = createdUser });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UserDto dto)
    {
        var existing = await _unitOfWork.Users.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
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

        existing.Email = dto.Email;
        existing.ADUsername = dto.ADUsername;
        existing.CivilNo = dto.CivilNo;
        existing.JobTitleId = dto.JobTitleId;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.Users.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        var updatedUser = await _unitOfWork.Users.FindAsync(x => x.Id == id, new[] { "JobTitle", "DepartmentUsers", "DepartmentUsers.Department", "DepartmentUsers.Department.Organization" });
        return Ok(new BaseResponse<User> { StatusCode = 200, Message = "User updated successfully.", Result = updatedUser });
    }

    [HttpPatch("{id}/Unlock")]
    public async Task<IActionResult> Unlock(int id)
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
    public async Task<IActionResult> Disabled(int id)
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
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Users.FindAsync(x => x.Id == id);
        existing.IsDeleted = true;
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
    public async Task<IActionResult> GetUserPermissions(int userId)
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
}
