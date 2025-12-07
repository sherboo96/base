using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using Microsoft.AspNetCore.Authorization;
using UMS.Models;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class PermissionsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    public PermissionsController(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var skip = (page - 1) * pageSize;
        var total = await _unitOfWork.Permissions.CountAsync(_ => true);
        var data = await _unitOfWork.Permissions.GetAllAsync(pageSize, skip, new[] { "System" });
        return Ok(new BaseResponse<IEnumerable<Permission>> { StatusCode = 200, Message = "Permissions retrieved successfully.", Result = data, Total = total, Pagination = new Pagination { CurrentPage = page, PageSize = pageSize, Total = total } });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Permissions.FindAsync(x => x.Id == id, new[] { "System" });
        return item == null ? NotFound(new BaseResponse<Permission> { StatusCode = 404, Message = "Permission not found." }) : Ok(new BaseResponse<Permission> { StatusCode = 200, Message = "Permission retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] PermissionDto dto)
    {
        var entity = await _unitOfWork.Permissions.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        // Automatically assign new permission to SuperAdmin role
        var superAdminRole = await _unitOfWork.Roles.FindAsync(r => r.Name == "SuperAdmin");
        if (superAdminRole != null)
        {
            var existingRolePermission = await _unitOfWork.RolePermissions.FindAsync(
                rp => rp.RoleId == superAdminRole.Id && rp.PermissionId == ((Permission)entity).Id);
            
            if (existingRolePermission == null)
            {
                var rolePermission = new RolePermission
                {
                    RoleId = superAdminRole.Id,
                    PermissionId = ((Permission)entity).Id
                };
                await _unitOfWork.RolePermissions.AddAsync(rolePermission);
                await _unitOfWork.CompleteAsync();
            }
        }
        
        return CreatedAtAction(nameof(GetById), new { id = ((Permission)entity).Id }, new BaseResponse<Permission> { StatusCode = 201, Message = "Permission created successfully.", Result = (Permission)entity });
    }

    [HttpPatch("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] PermissionDto dto)
    {
        var existing = await _unitOfWork.Permissions.FindAsync(x => x.Id == id);
        if (existing == null) return NotFound(new BaseResponse<Permission> { StatusCode = 404, Message = "Permission not found." });
        var updated = await _unitOfWork.Permissions.UpdateAsync(dto);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<Permission> { StatusCode = 200, Message = "Permission updated successfully.", Result = updated });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var deleted = await _unitOfWork.Permissions.DeleteAsync(id);
        if (!deleted) return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Permission not found.", Result = false });
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Permission deleted successfully.", Result = true });
    }
}
