using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using Microsoft.AspNetCore.Authorization;
using UMS.Models;
using UMS.Services;
using System.Linq.Expressions;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class RolesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly OrganizationAccessService _orgAccessService;

    public RolesController(IUnitOfWork unitOfWork, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _orgAccessService = orgAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var skip = (page - 1) * pageSize;
        
        // Get user's organization filter
        var userOrgId = await _orgAccessService.GetUserOrganizationIdAsync();
        var canAccessAll = await _orgAccessService.CanAccessAllOrganizationsAsync();
        
        // Build filter: show roles that are either:
        // 1. ApplyToAllOrganizations = true (available to all)
        // 2. ApplyToAllOrganizations = false AND OrganizationId matches user's organization (if user can't access all)
        // 3. All roles if user can access all organizations
        Expression<Func<Role, bool>> filter;
        
        if (canAccessAll)
        {
            // User can see all roles
            filter = x => !x.IsDeleted;
        }
        else if (userOrgId.HasValue)
        {
            // User can only see:
            // - Roles that apply to all organizations (ApplyToAllOrganizations = true)
            // - Roles that belong to their organization (OrganizationId matches)
            filter = x => !x.IsDeleted && 
                          (x.ApplyToAllOrganizations || 
                           (x.OrganizationId.HasValue && x.OrganizationId.Value == userOrgId.Value));
        }
        else
        {
            // User has no organization, only show roles that apply to all
            filter = x => !x.IsDeleted && x.ApplyToAllOrganizations;
        }
        
        var total = await _unitOfWork.Roles.CountAsync(filter);
        var data = await _unitOfWork.Roles.GetAllAsync(pageSize, skip, filter, null, null, new[] { "Organization" });
        return Ok(new BaseResponse<IEnumerable<Role>> { StatusCode = 200, Message = "Roles retrieved successfully.", Result = data, Total = total, Pagination = new Pagination { CurrentPage = page, PageSize = pageSize, Total = total } });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Roles.FindAsync(x => x.Id == id, new[] { "Organization" });
        return item == null ? NotFound(new BaseResponse<Role> { StatusCode = 404, Message = "Role not found." }) : Ok(new BaseResponse<Role> { StatusCode = 200, Message = "Role retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] RoleDto dto)
    {
        // If setting as default, ensure no other default role exists for this organization
        if (dto.IsDefault)
        {
            var existingDefaultRole = await _unitOfWork.Roles.FindAsync(
                r => !r.IsDeleted && 
                     r.IsDefault && 
                     ((dto.OrganizationId.HasValue && r.OrganizationId == dto.OrganizationId) ||
                      (!dto.OrganizationId.HasValue && r.ApplyToAllOrganizations && !r.OrganizationId.HasValue))
            );

            if (existingDefaultRole != null)
            {
                return BadRequest(new BaseResponse<Role>
                {
                    StatusCode = 400,
                    Message = "A default role already exists for this organization. Please unset the existing default role first.",
                    Result = null
                });
            }
        }

        var entity = await _unitOfWork.Roles.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        return CreatedAtAction(nameof(GetById), new { id = ((Role)entity).Id }, new BaseResponse<Role> { StatusCode = 201, Message = "Role created successfully.", Result = (Role)entity });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] RoleDto dto)
    {
        var existing = await _unitOfWork.Roles.FindAsync(x => x.Id == id);
        if (existing == null) return NotFound(new BaseResponse<Role> { StatusCode = 404, Message = "Role not found." });

        // If setting as default, ensure no other default role exists for this organization
        if (dto.IsDefault && !existing.IsDefault)
        {
            var existingDefaultRole = await _unitOfWork.Roles.FindAsync(
                r => !r.IsDeleted && 
                     r.Id != id &&
                     r.IsDefault && 
                     ((dto.OrganizationId.HasValue && r.OrganizationId == dto.OrganizationId) ||
                      (!dto.OrganizationId.HasValue && r.ApplyToAllOrganizations && !r.OrganizationId.HasValue))
            );

            if (existingDefaultRole != null)
            {
                return BadRequest(new BaseResponse<Role>
                {
                    StatusCode = 400,
                    Message = "A default role already exists for this organization. Please unset the existing default role first.",
                    Result = null
                });
            }
        }

        existing.Name = dto.Name;
        existing.ApplyToAllOrganizations = dto.ApplyToAllOrganizations;
        existing.OrganizationId = dto.OrganizationId;
        existing.IsDefault = dto.IsDefault;

        var updated = await _unitOfWork.Roles.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<Role> { StatusCode = 200, Message = "Role updated successfully.", Result = updated });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _unitOfWork.Roles.DeleteAsync(id);
        if (!deleted) return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Role not found.", Result = false });
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Role deleted successfully.", Result = true });
    }
}
