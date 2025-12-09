using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using Microsoft.AspNetCore.Authorization;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class UserRolesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public UserRolesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var skip = (page - 1) * pageSize;
        var total = await _unitOfWork.UserRoles.CountAsync(_ => true);
        var data = await _unitOfWork.UserRoles.GetAllAsync(pageSize, skip, new[] { "Role", "User" });

        return Ok(new BaseResponse<IEnumerable<UserRole>>
        {
            StatusCode = 200,
            Message = "UserRoles retrieved successfully.",
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

    [HttpGet("by-role/{roleId}")]
    public async Task<IActionResult> GetByRole(int roleId)
    {
        var data = await _unitOfWork.UserRoles.GetAllAsync(x => x.RoleId == roleId, new[] { "User", "Role" });
        return Ok(new BaseResponse<IEnumerable<UserRole>>
        {
            StatusCode = 200,
            Message = "Users for role retrieved successfully.",
            Result = data
        });
    }

    [HttpGet("{userId}/{roleId}")]
    public async Task<IActionResult> GetById(string userId, int roleId)
    {
        var item = await _unitOfWork.UserRoles.FindAsync(x => x.UserId == userId && x.RoleId == roleId, new[] { "Role", "User" });
        if (item == null)
        {
            return NotFound(new BaseResponse<UserRole>
            {
                StatusCode = 404,
                Message = "UserRole not found."
            });
        }

        return Ok(new BaseResponse<UserRole>
        {
            StatusCode = 200,
            Message = "UserRole retrieved successfully.",
            Result = item
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UserRoleDto dto)
    {
        var entity = await _unitOfWork.UserRoles.AddAsync(dto);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<UserRole>
        {
            StatusCode = 201,
            Message = "UserRole created successfully.",
            Result = (UserRole)entity
        });
    }

    [HttpDelete("{userId}/{roleId}")]
    public async Task<IActionResult> Delete(string userId, int roleId)
    {
        var item = await _unitOfWork.UserRoles.FindAsync(x => x.UserId == userId && x.RoleId == roleId);
        if (item == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "UserRole not found.",
                Result = false
            });
        }

        var deleted = await _unitOfWork.UserRoles.DeleteAsync(item);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "UserRole deleted successfully.",
            Result = true
        });
    }

    [HttpPut("{userId}/{roleId}")]
    public async Task<IActionResult> Update(string userId, int roleId, [FromBody] UserRoleDto dto)
    {
        // Find the existing user role
        var existingItem = await _unitOfWork.UserRoles.FindAsync(x => x.UserId == userId && x.RoleId == roleId);
        if (existingItem == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "UserRole not found.",
                Result = false
            });
        }

        // Convert dto.UserId (int) to string for comparison
        string newUserId = dto.UserId.ToString();

        // Check if the user or role actually changed
        if (existingItem.UserId == newUserId && existingItem.RoleId == dto.RoleId)
        {
            // No change needed
            return Ok(new BaseResponse<UserRole>
            {
                StatusCode = 200,
                Message = "UserRole unchanged.",
                Result = existingItem
            });
        }

        // Check if the new user-role combination already exists
        var existingNewItem = await _unitOfWork.UserRoles.FindAsync(x => x.UserId == newUserId && x.RoleId == dto.RoleId);
        if (existingNewItem != null)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "User already has this role.",
                Result = false
            });
        }

        // Delete the old user role
        await _unitOfWork.UserRoles.DeleteAsync(existingItem);
        
        // Create the new user role with proper UserId conversion
        var newUserRoleDto = new UserRoleDto
        {
            UserId = dto.UserId,
            RoleId = dto.RoleId
        };
        var newEntity = await _unitOfWork.UserRoles.AddAsync(newUserRoleDto);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<UserRole>
        {
            StatusCode = 200,
            Message = "UserRole updated successfully.",
            Result = (UserRole)newEntity
        });
    }

    [HttpDelete("remove-user-from-role")]
    public async Task<IActionResult> RemoveUserFromRole([FromQuery] string userId, [FromQuery] int roleId)
    {
        var item = await _unitOfWork.UserRoles.FindAsync(x => x.UserId == userId && x.RoleId == roleId);
        if (item == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "UserRole not found.",
                Result = false
            });
        }

        var deleted = await _unitOfWork.UserRoles.DeleteAsync(item);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "User removed from role successfully.",
            Result = true
        });
    }
}
