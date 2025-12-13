using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class CourseTabsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly OrganizationAccessService _orgAccessService;

    public CourseTabsController(IUnitOfWork unitOfWork, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _orgAccessService = orgAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string search = null,
        [FromQuery] int? organizationId = null,
        [FromQuery] bool? showInMenu = null,
        [FromQuery] bool? showPublic = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        // Build filter expression
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? search.ToLower().Trim() : "";

        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        var effectiveOrgFilter = organizationId ?? orgFilter;

        Expression<Func<CourseTab, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower))) &&
            (!effectiveOrgFilter.HasValue || x.OrganizationId == effectiveOrgFilter.Value || x.ShowForOtherOrganizations == true) &&
            (!showInMenu.HasValue || x.ShowInMenu == showInMenu.Value) &&
            (!showPublic.HasValue || x.ShowPublic == showPublic.Value);

        var total = await _unitOfWork.CourseTabs.CountAsync(filter);
        var data = await _unitOfWork.CourseTabs.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            new[] { "Organization" }
        );

        var response = new BaseResponse<IEnumerable<CourseTab>>
        {
            StatusCode = 200,
            Message = "Course tabs retrieved successfully.",
            Result = data,
            Total = total,
            Pagination = new Pagination
            {
                CurrentPage = page,
                PageSize = pageSize,
                Total = total
            }
        };

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        return item == null
            ? NotFound(new BaseResponse<CourseTab> { StatusCode = 404, Message = "Course tab not found." })
            : Ok(new BaseResponse<CourseTab> { StatusCode = 200, Message = "Course tab retrieved successfully.", Result = item });
    }

    [HttpGet("by-route/{routeCode}")]
    public async Task<IActionResult> GetByRouteCode(string routeCode)
    {
        var item = await _unitOfWork.CourseTabs.FindAsync(x => x.RouteCode == routeCode && !x.IsDeleted, new[] { "Organization" });
        return item == null
            ? NotFound(new BaseResponse<CourseTab> { StatusCode = 404, Message = "Course tab not found." })
            : Ok(new BaseResponse<CourseTab> { StatusCode = 200, Message = "Course tab retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CourseTabDto dto)
    {
        var entity = await _unitOfWork.CourseTabs.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the created entity with Organization relationship
        var createdId = ((CourseTab)entity).Id;
        var result = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == createdId && !x.IsDeleted, new[] { "Organization" });
        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<CourseTab> { StatusCode = 201, Message = "Course tab created successfully.", Result = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CourseTabDto dto)
    {
        var existing = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<CourseTab> { StatusCode = 404, Message = "Course tab not found." });

        existing.Name = dto.Name;
        existing.NameAr = dto.NameAr;
            existing.RouteCode = dto.RouteCode;
            existing.Icon = dto.Icon;
            existing.ExcuseTimeHours = dto.ExcuseTimeHours;
        existing.OrganizationId = dto.OrganizationId;
        existing.ShowInMenu = dto.ShowInMenu;
        existing.ShowPublic = dto.ShowPublic;
        existing.ShowForOtherOrganizations = dto.ShowForOtherOrganizations;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.CourseTabs.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the updated entity with Organization relationship
        var result = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        return Ok(new BaseResponse<CourseTab> { StatusCode = 200, Message = "Course tab updated successfully.", Result = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Course tab not found." });
        
        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.CourseTabs.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Course tab deleted successfully.", Result = true });
    }

    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var existing = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Course tab not found.",
                Result = false
            });
        }

        existing.IsActive = !existing.IsActive;
        existing.UpdatedAt = DateTime.Now;

        await _unitOfWork.CourseTabs.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<CourseTab>
        {
            StatusCode = 200,
            Message = $"Course tab {(existing.IsActive ? "activated" : "deactivated")} successfully.",
            Result = existing
        });
    }

    [HttpPatch("{id}/toggle-menu")]
    public async Task<IActionResult> ToggleShowInMenu(int id)
    {
        var existing = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Course tab not found.",
                Result = false
            });
        }

        existing.ShowInMenu = !existing.ShowInMenu;
        existing.UpdatedAt = DateTime.Now;

        await _unitOfWork.CourseTabs.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<CourseTab>
        {
            StatusCode = 200,
            Message = $"Course tab {(existing.ShowInMenu ? "shown" : "hidden")} in menu successfully.",
            Result = existing
        });
    }

    [HttpPatch("{id}/toggle-public")]
    public async Task<IActionResult> ToggleShowPublic(int id)
    {
        var existing = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Course tab not found.",
                Result = false
            });
        }

        existing.ShowPublic = !existing.ShowPublic;
        existing.UpdatedAt = DateTime.Now;

        await _unitOfWork.CourseTabs.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<CourseTab>
        {
            StatusCode = 200,
            Message = $"Course tab {(existing.ShowPublic ? "shown" : "hidden")} for public successfully.",
            Result = existing
        });
    }
}
