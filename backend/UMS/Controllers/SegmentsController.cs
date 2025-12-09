using System.Linq.Expressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;
using UMS.Dtos;
using Microsoft.AspNetCore.Authorization;
using UMS.Models;
using AutoMapper;
using UMS.Const;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class SegmentsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly OrganizationAccessService _orgAccessService;

    public SegmentsController(IUnitOfWork unitOfWork, IMapper mapper, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _orgAccessService = orgAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] int? organizationId = null)
    {
        page = page <= 0 ? 1 : page;
        pageSize = pageSize <= 0 ? 10 : pageSize;

        var skip = (page - 1) * pageSize;

        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        var effectiveOrgFilter = organizationId ?? orgFilter;

        Expression<Func<Segment, bool>> filter = s =>
            !s.IsDeleted &&
            (!effectiveOrgFilter.HasValue || s.OrganizationId == effectiveOrgFilter.Value);

        var total = await _unitOfWork.Segments.CountAsync(filter);
        var data = await _unitOfWork.Segments.GetAllAsync(
            pageSize,
            skip,
            filter,
            s => s.Name,
            OrderBy.Ascending,
            new[] { "Organization", "UserSegments" });

        // Map to DTOs with user count
        var result = data.Select(s => new SegmentDto
        {
            Id = s.Id,
            Name = s.Name,
            NameAr = s.NameAr,
            Code = s.Code,
            OrganizationId = s.OrganizationId,
            Organization = _mapper.Map<OrganizationDto>(s.Organization),
            UserCount = s.UserSegments?.Count ?? 0,
            IsActive = s.IsActive,
            CreatedOn = s.CreatedOn,
            CreatedBy = s.CreatedBy,
            UpdatedAt = s.UpdatedAt,
            UpdatedBy = s.UpdatedBy
        });

        return Ok(new BaseResponse<IEnumerable<SegmentDto>>
        {
            StatusCode = 200,
            Message = "Segments retrieved successfully.",
            Result = result,
            Total = total,
            Pagination = new Pagination { CurrentPage = page, PageSize = pageSize, Total = total }
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Segments.GetWithUsersAsync(id);
        if (item == null)
            return NotFound(new BaseResponse<Segment> { StatusCode = 404, Message = "Segment not found." });

        var result = new SegmentDto
        {
            Id = item.Id,
            Name = item.Name,
            NameAr = item.NameAr,
            Code = item.Code,
            OrganizationId = item.OrganizationId,
            Organization = _mapper.Map<OrganizationDto>(item.Organization),
            Users = item.UserSegments?.Select(us => new SegmentUserInfoDto
            {
                Id = us.User.Id, // Keep as string (GUID)
                FullName = us.User.FullName,
                Email = us.User.Email ?? string.Empty,
                ADUsername = us.User.ADUsername ?? string.Empty,
                CivilNo = us.User.CivilNo,
                JobTitleId = us.User.JobTitleId,
                JobTitle = us.User.JobTitle != null ? _mapper.Map<JobTitleDto>(us.User.JobTitle) : null,
                OrganizationId = us.User.OrganizationId,
                DepartmentId = us.User.DepartmentId,
                LastLogin = us.User.LastLogin,
                LoginMethod = us.User.LoginMethod,
                IsActive = us.User.IsActive
            }).ToList(),
            UserIds = item.UserSegments?.Select(us => us.UserId).ToList(),
            UserCount = item.UserSegments?.Count ?? 0,
            IsActive = item.IsActive,
            CreatedOn = item.CreatedOn,
            CreatedBy = item.CreatedBy,
            UpdatedAt = item.UpdatedAt,
            UpdatedBy = item.UpdatedBy
        };

        return Ok(new BaseResponse<SegmentDto>
        {
            StatusCode = 200,
            Message = "Segment retrieved successfully.",
            Result = result
        });
    }

    [HttpGet("all")]
    public async Task<IActionResult> GetAllSegments([FromQuery] int? organizationId = null)
    {
        Expression<Func<Segment, bool>> filter = s =>
            !s.IsDeleted && s.IsActive &&
            (!organizationId.HasValue || s.OrganizationId == organizationId);

        var data = await _unitOfWork.Segments.GetAllAsync(filter, new[] { "Organization" });

        var result = data.Select(s => new SegmentDto
        {
            Id = s.Id,
            Name = s.Name,
            NameAr = s.NameAr,
            Code = s.Code,
            OrganizationId = s.OrganizationId,
            Organization = _mapper.Map<OrganizationDto>(s.Organization),
            IsActive = s.IsActive
        });

        return Ok(new BaseResponse<IEnumerable<SegmentDto>>
        {
            StatusCode = 200,
            Message = "All segments retrieved successfully.",
            Result = result
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSegmentDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new BaseResponse<CreateSegmentDto>
            {
                StatusCode = 400,
                Message = "Invalid data.",
                Result = dto
            });

        // Check if code already exists
        if (await _unitOfWork.Segments.CodeExistsAsync(dto.Code))
            return BadRequest(new BaseResponse<string>
            {
                StatusCode = 400,
                Message = "Segment code already exists."
            });

        // Verify organization exists
        var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == dto.OrganizationId && !o.IsDeleted);
        if (organization == null)
            return BadRequest(new BaseResponse<string>
            {
                StatusCode = 400,
                Message = "Organization not found."
            });

        var segment = new Segment
        {
            Name = dto.Name,
            NameAr = dto.NameAr,
            Code = dto.Code,
            OrganizationId = dto.OrganizationId,
            IsActive = true,
            IsDeleted = false,
            CreatedOn = DateTime.Now,
            CreatedBy = User.Identity?.Name
        };

        await _unitOfWork.Segments.AddAsync(segment);
        await _unitOfWork.CompleteAsync();

        // Assign users if provided
        if (dto.UserIds != null && dto.UserIds.Any())
        {
            await _unitOfWork.Segments.AssignUsersAsync(segment.Id, dto.UserIds);
        }

        return Ok(new BaseResponse<Segment>
        {
            StatusCode = 200,
            Message = "Segment created successfully.",
            Result = segment
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSegmentDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(new BaseResponse<UpdateSegmentDto>
            {
                StatusCode = 400,
                Message = "Invalid data.",
                Result = dto
            });

        var segment = await _unitOfWork.Segments.FindAsync(s => s.Id == id && !s.IsDeleted);
        if (segment == null)
            return NotFound(new BaseResponse<string> { StatusCode = 404, Message = "Segment not found." });

        // Check if code already exists (excluding current segment)
        if (await _unitOfWork.Segments.CodeExistsAsync(dto.Code, id))
            return BadRequest(new BaseResponse<string>
            {
                StatusCode = 400,
                Message = "Segment code already exists."
            });

        // Verify organization exists
        var organization = await _unitOfWork.Organizations.FindAsync(o => o.Id == dto.OrganizationId && !o.IsDeleted);
        if (organization == null)
            return BadRequest(new BaseResponse<string>
            {
                StatusCode = 400,
                Message = "Organization not found."
            });

        segment.Name = dto.Name;
        segment.NameAr = dto.NameAr;
        segment.Code = dto.Code;
        segment.OrganizationId = dto.OrganizationId;
        segment.IsActive = dto.IsActive;
        segment.UpdatedAt = DateTime.Now;
        segment.UpdatedBy = User.Identity?.Name;

        await _unitOfWork.Segments.UpdateAsync(segment);
        await _unitOfWork.CompleteAsync();

        // Update user assignments if provided
        if (dto.UserIds != null)
        {
            await _unitOfWork.Segments.AssignUsersAsync(segment.Id, dto.UserIds);
        }

        return Ok(new BaseResponse<Segment>
        {
            StatusCode = 200,
            Message = "Segment updated successfully.",
            Result = segment
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var segment = await _unitOfWork.Segments.FindAsync(s => s.Id == id && !s.IsDeleted);
        if (segment == null)
            return NotFound(new BaseResponse<string> { StatusCode = 404, Message = "Segment not found." });

        segment.IsDeleted = true;
        segment.UpdatedAt = DateTime.Now;
        segment.UpdatedBy = User.Identity?.Name;

        await _unitOfWork.Segments.UpdateAsync(segment);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<string>
        {
            StatusCode = 200,
            Message = "Segment deleted successfully."
        });
    }

    [HttpPost("{id}/assign-users")]
    public async Task<IActionResult> AssignUsers(int id, [FromBody] SegmentUserDto dto)
    {
        var segment = await _unitOfWork.Segments.FindAsync(s => s.Id == id && !s.IsDeleted);
        if (segment == null)
            return NotFound(new BaseResponse<string> { StatusCode = 404, Message = "Segment not found." });

        // Verify all users exist and belong to the same organization
        var users = await _unitOfWork.Users.GetAllAsync(
            u => dto.UserIds.Contains(u.Id) && !u.IsDeleted && u.OrganizationId == segment.OrganizationId);

        if (users.Count() != dto.UserIds.Count)
            return BadRequest(new BaseResponse<string>
            {
                StatusCode = 400,
                Message = "Some users not found or do not belong to the segment's organization."
            });

        var success = await _unitOfWork.Segments.AssignUsersAsync(id, dto.UserIds);
        if (!success)
            return BadRequest(new BaseResponse<string>
            {
                StatusCode = 400,
                Message = "Failed to assign users to segment."
            });

        return Ok(new BaseResponse<string>
        {
            StatusCode = 200,
            Message = "Users assigned to segment successfully."
        });
    }

    [HttpPost("{id}/remove-users")]
    public async Task<IActionResult> RemoveUsers(int id, [FromBody] SegmentUserDto dto)
    {
        var segment = await _unitOfWork.Segments.FindAsync(s => s.Id == id && !s.IsDeleted);
        if (segment == null)
            return NotFound(new BaseResponse<string> { StatusCode = 404, Message = "Segment not found." });

        var success = await _unitOfWork.Segments.RemoveUsersAsync(id, dto.UserIds);
        if (!success)
            return BadRequest(new BaseResponse<string>
            {
                StatusCode = 400,
                Message = "Failed to remove users from segment."
            });

        return Ok(new BaseResponse<string>
        {
            StatusCode = 200,
            Message = "Users removed from segment successfully."
        });
    }

    [HttpGet("by-organization/{organizationId}")]
    public async Task<IActionResult> GetByOrganizationId(int organizationId)
    {
        var data = await _unitOfWork.Segments.GetByOrganizationIdAsync(organizationId);

        var result = data.Select(s => new SegmentDto
        {
            Id = s.Id,
            Name = s.Name,
            NameAr = s.NameAr,
            Code = s.Code,
            OrganizationId = s.OrganizationId,
            Organization = _mapper.Map<OrganizationDto>(s.Organization),
            UserCount = s.UserSegments?.Count ?? 0,
            IsActive = s.IsActive
        });

        return Ok(new BaseResponse<IEnumerable<SegmentDto>>
        {
            StatusCode = 200,
            Message = "Segments retrieved successfully.",
            Result = result
        });
    }
}
