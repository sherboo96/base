using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class AdoptionUsersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly OrganizationAccessService _orgAccessService;

    public AdoptionUsersController(IUnitOfWork unitOfWork, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _orgAccessService = orgAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string search = null,
        [FromQuery] int? organizationId = null)
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

        Expression<Func<AdoptionUser, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)) ||
             (x.Email != null && x.Email.ToLower().Contains(searchLower)) ||
             (x.Bio != null && x.Bio.ToLower().Contains(searchLower))) &&
            (!effectiveOrgFilter.HasValue || x.OrganizationId == effectiveOrgFilter.Value);

        var total = await _unitOfWork.AdoptionUsers.CountAsync(filter);
        var data = await _unitOfWork.AdoptionUsers.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            new[] { "Organization" }
        );

        var response = new BaseResponse<IEnumerable<AdoptionUser>>
        {
            StatusCode = 200,
            Message = "Adoption users retrieved successfully.",
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
        var item = await _unitOfWork.AdoptionUsers.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        return item == null
            ? NotFound(new BaseResponse<AdoptionUser> { StatusCode = 404, Message = "Adoption user not found." })
            : Ok(new BaseResponse<AdoptionUser> { StatusCode = 200, Message = "Adoption user retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AdoptionUserDto dto)
    {
        var entity = await _unitOfWork.AdoptionUsers.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the created entity with Organization relationship
        var createdId = ((AdoptionUser)entity).Id;
        var result = await _unitOfWork.AdoptionUsers.FindAsync(x => x.Id == createdId && !x.IsDeleted, new[] { "Organization" });
        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<AdoptionUser> { StatusCode = 201, Message = "Adoption user created successfully.", Result = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] AdoptionUserDto dto)
    {
        var existing = await _unitOfWork.AdoptionUsers.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<AdoptionUser> { StatusCode = 404, Message = "Adoption user not found." });

        existing.Name = dto.Name;
        existing.NameAr = dto.NameAr;
        existing.Attendance = dto.Attendance;
        existing.Email = dto.Email;
        existing.Bio = dto.Bio;
        existing.OrganizationId = dto.OrganizationId;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.AdoptionUsers.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the updated entity with Organization relationship
        var result = await _unitOfWork.AdoptionUsers.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        return Ok(new BaseResponse<AdoptionUser> { StatusCode = 200, Message = "Adoption user updated successfully.", Result = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.AdoptionUsers.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Adoption user not found.", Result = false });
        
        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.AdoptionUsers.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Adoption user deleted successfully.", Result = true });
    }

    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var existing = await _unitOfWork.AdoptionUsers.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Adoption user not found.",
                Result = false
            });
        }

        existing.IsActive = !existing.IsActive;
        existing.UpdatedAt = DateTime.Now;

        await _unitOfWork.AdoptionUsers.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<AdoptionUser>
        {
            StatusCode = 200,
            Message = $"Adoption user {(existing.IsActive ? "activated" : "deactivated")} successfully.",
            Result = existing
        });
    }
}
