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

public class LocationsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly OrganizationAccessService _orgAccessService;

    public LocationsController(IUnitOfWork unitOfWork, OrganizationAccessService orgAccessService)
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
        [FromQuery] string filterCategory = "all") // "all", "onsite", "online", "outsite", "abroad"
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        // Build filter expression
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? search.ToLower().Trim() : "";
        var hasCategoryFilter = filterCategory != "all";
        LocationCategory? categoryFilter = null;
        if (hasCategoryFilter)
        {
            categoryFilter = filterCategory.ToLower() switch
            {
                "onsite" => LocationCategory.Onsite,
                "online" => LocationCategory.Online,
                "outsite" => LocationCategory.OutSite,
                "abroad" => LocationCategory.Abroad,
                _ => null
            };
        }

        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        var effectiveOrgFilter = organizationId ?? orgFilter;

        Expression<Func<Location, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)) ||
             (x.Floor != null && x.Floor.ToLower().Contains(searchLower)) ||
             (x.Building != null && x.Building.ToLower().Contains(searchLower))) &&
            (!effectiveOrgFilter.HasValue || x.OrganizationId == effectiveOrgFilter.Value) &&
            (!hasCategoryFilter || !categoryFilter.HasValue || x.Category == categoryFilter.Value);

        var total = await _unitOfWork.Locations.CountAsync(filter);
        var data = await _unitOfWork.Locations.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            new[] { "Organization" }
        );

        var response = new BaseResponse<IEnumerable<Location>>
        {
            StatusCode = 200,
            Message = "Locations retrieved successfully.",
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
        var item = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        return item == null
            ? NotFound(new BaseResponse<Location> { StatusCode = 404, Message = "Location not found." })
            : Ok(new BaseResponse<Location> { StatusCode = 200, Message = "Location retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] LocationDto dto)
    {
        var entity = await _unitOfWork.Locations.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the created entity with Organization relationship
        var createdId = ((Location)entity).Id;
        var result = await _unitOfWork.Locations.FindAsync(x => x.Id == createdId && !x.IsDeleted, new[] { "Organization" });
        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<Location> { StatusCode = 201, Message = "Location created successfully.", Result = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] LocationDto dto)
    {
        var existing = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Location> { StatusCode = 404, Message = "Location not found." });

        existing.Name = dto.Name;
        existing.NameAr = dto.NameAr;
        existing.Floor = dto.Floor;
        existing.Building = dto.Building;
        existing.Category = dto.Category;
        existing.OrganizationId = dto.OrganizationId;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.Locations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the updated entity with Organization relationship
        var result = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        return Ok(new BaseResponse<Location> { StatusCode = 200, Message = "Location updated successfully.", Result = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Location> { StatusCode = 404, Message = "Location not found." });
        
        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.Locations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Location deleted successfully.", Result = true });
    }

    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var existing = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Location not found.",
                Result = false
            });
        }

        existing.IsActive = !existing.IsActive;
        existing.UpdatedAt = DateTime.Now;

        await _unitOfWork.Locations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<Location>
        {
            StatusCode = 200,
            Message = $"Location {(existing.IsActive ? "activated" : "deactivated")} successfully.",
            Result = existing
        });
    }
}
