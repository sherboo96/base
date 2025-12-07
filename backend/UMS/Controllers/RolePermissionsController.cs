using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using Microsoft.AspNetCore.Authorization;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class RolePermissionsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public RolePermissionsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var skip = (page - 1) * pageSize;
        var total = await _unitOfWork.RolePermissions.CountAsync(_ => true);
        var data = await _unitOfWork.RolePermissions.GetAllAsync(pageSize, skip, new[] { "Permission", "Role" });

        return Ok(new BaseResponse<IEnumerable<RolePermission>>
        {
            StatusCode = 200,
            Message = "Role permissions retrieved successfully.",
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

    [HttpGet("{roleId}/{permissionId}")]
    public async Task<IActionResult> GetById(int roleId, int permissionId)
    {
        var item = await _unitOfWork.RolePermissions.FindAsync(x => x.RoleId == roleId && x.PermissionId == permissionId, new[] { "Permission", "Role" });
        if (item == null)
        {
            return NotFound(new BaseResponse<RolePermission>
            {
                StatusCode = 404,
                Message = "RolePermission not found."
            });
        }

        return Ok(new BaseResponse<RolePermission>
        {
            StatusCode = 200,
            Message = "RolePermission retrieved successfully.",
            Result = item
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RolePermissionDto dto)
    {
        var entity = await _unitOfWork.RolePermissions.AddAsync(dto);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<RolePermission>
        {
            StatusCode = 201,
            Message = "RolePermission created successfully.",
            Result = (RolePermission)entity
        });
    }

    [HttpDelete("{roleId}/{permissionId}")]
    public async Task<IActionResult> Delete(int roleId, int permissionId)
    {
        var item = await _unitOfWork.RolePermissions.FindAsync(x => x.RoleId == roleId && x.PermissionId == permissionId);
        if (item == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "RolePermission not found.",
                Result = false
            });
        }

        var deleted = await _unitOfWork.RolePermissions.DeleteAsync(item);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "RolePermission deleted successfully.",
            Result = true
        });
    }
}
