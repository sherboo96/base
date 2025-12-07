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
        var data = await _unitOfWork.UserRoles.GetAllAsync(pageSize, skip, new[] { "Role", "User", "Role.System" });

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
        var data = await _unitOfWork.UserRoles.GetAllAsync(x => x.RoleId == roleId, new[] { "User", "Role", "Role.System" });
        return Ok(new BaseResponse<IEnumerable<UserRole>>
        {
            StatusCode = 200,
            Message = "Users for role retrieved successfully.",
            Result = data
        });
    }

    [HttpGet("{userId}/{roleId}")]
    public async Task<IActionResult> GetById(int userId, int roleId)
    {
        var item = await _unitOfWork.UserRoles.FindAsync(x => x.UserId == userId && x.RoleId == roleId, new[] { "Role", "User", "Role.System" });
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
    public async Task<IActionResult> Delete(int userId, int roleId)
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

    [HttpDelete("remove-user-from-role")]
    public async Task<IActionResult> RemoveUserFromRole([FromQuery] int userId, [FromQuery] int roleId)
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
