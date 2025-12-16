using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EventOrganizationsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public EventOrganizationsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var skip = (page - 1) * pageSize;

        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? (search ?? "").ToLower().Trim() : "";

        Expression<Func<EventOrganization, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)));

        Expression<Func<EventOrganization, object>> orderBy = x => x.CreatedOn;

        var data = await _unitOfWork.EventOrganizations.GetAllAsync(
            pageSize,
            skip,
            filter,
            orderBy,
            "DESC"
        );

        var total = await _unitOfWork.EventOrganizations.CountAsync(filter);

        var dtos = data.Select(o => MapToDto(o)).ToList();

        return Ok(new BaseResponse<List<EventOrganizationDto>>
        {
            StatusCode = 200,
            Message = "Event organizations retrieved successfully.",
            Result = dtos,
            Total = total,
            Pagination = new Pagination
            {
                CurrentPage = page,
                PageSize = pageSize,
                Total = total
            }
        });
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllActive()
    {
        var data = await _unitOfWork.EventOrganizations.GetAllAsync(
            x => !x.IsDeleted && x.IsActive
        );

        var dtos = data.Select(o => MapToDto(o)).ToList();

        return Ok(new BaseResponse<List<EventOrganizationDto>>
        {
            StatusCode = 200,
            Message = "Event organizations retrieved successfully.",
            Result = dtos
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var organization = await _unitOfWork.EventOrganizations.FindAsync(x => x.Id == id && !x.IsDeleted);

        if (organization == null)
        {
            return NotFound(new BaseResponse<EventOrganizationDto>
            {
                StatusCode = 404,
                Message = "Event organization not found.",
                Result = null
            });
        }

        var dto = MapToDto(organization);
        return Ok(new BaseResponse<EventOrganizationDto>
        {
            StatusCode = 200,
            Message = "Event organization retrieved successfully.",
            Result = dto
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventOrganizationDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        var entity = await _unitOfWork.EventOrganizations.AddAsync(dto);
        await _unitOfWork.CompleteAsync();

        return CreatedAtAction(nameof(GetById), new { id = ((EventOrganization)entity).Id }, new BaseResponse<EventOrganizationDto>
        {
            StatusCode = 201,
            Message = "Event organization created successfully.",
            Result = MapToDto((EventOrganization)entity)
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] EventOrganizationDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        var existing = await _unitOfWork.EventOrganizations.FindAsync(x => x.Id == id && !x.IsDeleted);

        if (existing == null)
        {
            return NotFound(new BaseResponse<EventOrganizationDto>
            {
                StatusCode = 404,
                Message = "Event organization not found.",
                Result = null
            });
        }

        dto.Id = id;
        var updated = await _unitOfWork.EventOrganizations.UpdateAsync(dto);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<EventOrganizationDto>
        {
            StatusCode = 200,
            Message = "Event organization updated successfully.",
            Result = MapToDto((EventOrganization)updated)
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.EventOrganizations.FindAsync(x => x.Id == id && !x.IsDeleted);

        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Event organization not found.",
                Result = false
            });
        }

        await _unitOfWork.EventOrganizations.DeleteAsync(id);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Event organization deleted successfully.",
            Result = true
        });
    }

    private EventOrganizationDto MapToDto(EventOrganization organization)
    {
        return new EventOrganizationDto
        {
            Id = organization.Id,
            Name = organization.Name,
            NameAr = organization.NameAr,
            IsActive = organization.IsActive,
            CreatedAt = organization.CreatedOn,
            CreatedBy = organization.CreatedBy,
            UpdatedAt = organization.UpdatedAt,
            UpdatedBy = organization.UpdatedBy
        };
    }
}

