using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;
using UMS.Data;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CourseTabApprovalsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly OrganizationAccessService _orgAccessService;

    public CourseTabApprovalsController(IUnitOfWork unitOfWork, ApplicationDbContext context, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _orgAccessService = orgAccessService;
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] int? courseTabId = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        var query = _context.CourseTabApprovals
            .Include(cta => cta.CourseTab)
            .Include(cta => cta.Role)
            .Where(cta => !cta.IsDeleted);

        if (courseTabId.HasValue)
        {
            query = query.Where(cta => cta.CourseTabId == courseTabId.Value);
        }

        var total = await query.CountAsync();
        var data = await query
            .OrderBy(cta => cta.CourseTabId)
            .ThenBy(cta => cta.ApprovalOrder)
            .Skip(skip)
            .Take(pageSize)
            .ToListAsync();

        var dtos = data.Select(a => new CourseTabApprovalDto
        {
            Id = a.Id,
            CourseTabId = a.CourseTabId,
            ApprovalOrder = a.ApprovalOrder,
            IsHeadApproval = a.IsHeadApproval,
            RoleId = a.RoleId,
            Role = a.Role != null ? new RoleDto
            {
                Id = a.Role.Id,
                Name = a.Role.Name,
                ApplyToAllOrganizations = a.Role.ApplyToAllOrganizations,
                OrganizationId = a.Role.OrganizationId,
                IsDefault = a.Role.IsDefault
            } : null,
            CourseTab = a.CourseTab != null ? new CourseTabDto
            {
                Id = a.CourseTab.Id,
                Name = a.CourseTab.Name,
                NameAr = a.CourseTab.NameAr,
                RouteCode = a.CourseTab.RouteCode,
                Icon = a.CourseTab.Icon,
                ExcuseTimeHours = a.CourseTab.ExcuseTimeHours,
                OrganizationId = a.CourseTab.OrganizationId,
                ShowInMenu = a.CourseTab.ShowInMenu,
                ShowPublic = a.CourseTab.ShowPublic,
                ShowForOtherOrganizations = a.CourseTab.ShowForOtherOrganizations,
                Approvals = new List<CourseTabApprovalDto>() // Empty to avoid circular reference
            } : null
        }).ToList();

        var response = new BaseResponse<IEnumerable<CourseTabApprovalDto>>
        {
            StatusCode = 200,
            Message = "Course tab approvals retrieved successfully.",
            Result = dtos,
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

    [HttpGet("course-tab/{courseTabId}")]
    public async Task<IActionResult> GetByCourseTab(int courseTabId)
    {
        var courseTab = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == courseTabId && !x.IsDeleted);
        if (courseTab == null)
        {
            return NotFound(new BaseResponse<IEnumerable<CourseTabApprovalDto>>
            {
                StatusCode = 404,
                Message = "Course tab not found."
            });
        }

        var approvals = await _context.CourseTabApprovals
            .Include(a => a.Role)
            .Where(a => a.CourseTabId == courseTabId && !a.IsDeleted)
            .OrderBy(a => a.ApprovalOrder)
            .ToListAsync();

        var approvalDtos = approvals.Select(a => new CourseTabApprovalDto
        {
            Id = a.Id,
            CourseTabId = a.CourseTabId,
            ApprovalOrder = a.ApprovalOrder,
            IsHeadApproval = a.IsHeadApproval,
            RoleId = a.RoleId,
            Role = a.Role != null ? new RoleDto
            {
                Id = a.Role.Id,
                Name = a.Role.Name,
                ApplyToAllOrganizations = a.Role.ApplyToAllOrganizations,
                OrganizationId = a.Role.OrganizationId,
                IsDefault = a.Role.IsDefault
            } : null
        }).ToList();

        return Ok(new BaseResponse<IEnumerable<CourseTabApprovalDto>>
        {
            StatusCode = 200,
            Message = "Approvals retrieved successfully.",
            Result = approvalDtos
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCourseTabApprovalDto dto)
    {
        var courseTab = await _unitOfWork.CourseTabs.FindAsync(x => x.Id == dto.CourseTabId && !x.IsDeleted);
        if (courseTab == null)
        {
            return NotFound(new BaseResponse<CourseTabApprovalDto>
            {
                StatusCode = 404,
                Message = "Course tab not found."
            });
        }

        // Validate: If not Head Approval, RoleId must be provided
        if (!dto.IsHeadApproval && !dto.RoleId.HasValue)
        {
            return BadRequest(new BaseResponse<CourseTabApprovalDto>
            {
                StatusCode = 400,
                Message = "Role must be specified for non-Head approvals."
            });
        }

        // Validate: If Head Approval, RoleId should be null
        if (dto.IsHeadApproval && dto.RoleId.HasValue)
        {
            return BadRequest(new BaseResponse<CourseTabApprovalDto>
            {
                StatusCode = 400,
                Message = "Head Approval should not have a Role."
            });
        }

        // Check if role exists (if provided)
        if (dto.RoleId.HasValue)
        {
            var role = await _unitOfWork.Roles.FindAsync(x => x.Id == dto.RoleId.Value && !x.IsDeleted);
            if (role == null)
            {
                return NotFound(new BaseResponse<CourseTabApprovalDto>
                {
                    StatusCode = 404,
                    Message = "Role not found."
                });
            }
        }

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("UserId")?.Value
                          ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        var approval = new CourseTabApproval
        {
            CourseTabId = dto.CourseTabId,
            ApprovalOrder = dto.ApprovalOrder,
            IsHeadApproval = dto.IsHeadApproval,
            RoleId = dto.RoleId,
            CreatedBy = currentUserId,
            CreatedOn = DateTime.Now
        };

        var created = await _unitOfWork.CourseTabApprovals.AddAsync(approval);
        await _unitOfWork.CompleteAsync();

        var createdId = ((CourseTabApproval)created).Id;
        var result = await _unitOfWork.CourseTabApprovals.FindAsync(
            x => x.Id == createdId && !x.IsDeleted,
            includes: new[] { "Role" }
        );

        var resultDto = new CourseTabApprovalDto
        {
            Id = result.Id,
            CourseTabId = result.CourseTabId,
            ApprovalOrder = result.ApprovalOrder,
            IsHeadApproval = result.IsHeadApproval,
            RoleId = result.RoleId,
            Role = result.Role != null ? new RoleDto
            {
                Id = result.Role.Id,
                Name = result.Role.Name,
                ApplyToAllOrganizations = result.Role.ApplyToAllOrganizations,
                OrganizationId = result.Role.OrganizationId,
                IsDefault = result.Role.IsDefault
            } : null
        };

        return CreatedAtAction(nameof(GetByCourseTab), new { courseTabId = dto.CourseTabId }, new BaseResponse<CourseTabApprovalDto>
        {
            StatusCode = 201,
            Message = "Approval created successfully.",
            Result = resultDto
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCourseTabApprovalDto dto)
    {
        var existing = await _unitOfWork.CourseTabApprovals.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            includes: new[] { "CourseTab", "Role" }
        );

        if (existing == null)
        {
            return NotFound(new BaseResponse<CourseTabApprovalDto>
            {
                StatusCode = 404,
                Message = "Approval not found."
            });
        }

        // Validate: If not Head Approval, RoleId must be provided
        if (!dto.IsHeadApproval && !dto.RoleId.HasValue)
        {
            return BadRequest(new BaseResponse<CourseTabApprovalDto>
            {
                StatusCode = 400,
                Message = "Role must be specified for non-Head approvals."
            });
        }

        // Validate: If Head Approval, RoleId should be null
        if (dto.IsHeadApproval && dto.RoleId.HasValue)
        {
            return BadRequest(new BaseResponse<CourseTabApprovalDto>
            {
                StatusCode = 400,
                Message = "Head Approval should not have a Role."
            });
        }

        // Check if role exists (if provided)
        if (dto.RoleId.HasValue)
        {
            var role = await _unitOfWork.Roles.FindAsync(x => x.Id == dto.RoleId.Value && !x.IsDeleted);
            if (role == null)
            {
                return NotFound(new BaseResponse<CourseTabApprovalDto>
                {
                    StatusCode = 404,
                    Message = "Role not found."
                });
            }
        }

        var currentUserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                          ?? User.FindFirst("UserId")?.Value
                          ?? User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;

        existing.ApprovalOrder = dto.ApprovalOrder;
        existing.IsHeadApproval = dto.IsHeadApproval;
        existing.RoleId = dto.RoleId;
        existing.UpdatedBy = currentUserId;
        existing.UpdatedAt = DateTime.Now;

        await _unitOfWork.CourseTabApprovals.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.CourseTabApprovals.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            includes: new[] { "Role" }
        );

        var resultDto = new CourseTabApprovalDto
        {
            Id = result.Id,
            CourseTabId = result.CourseTabId,
            ApprovalOrder = result.ApprovalOrder,
            IsHeadApproval = result.IsHeadApproval,
            RoleId = result.RoleId,
            Role = result.Role != null ? new RoleDto
            {
                Id = result.Role.Id,
                Name = result.Role.Name,
                ApplyToAllOrganizations = result.Role.ApplyToAllOrganizations,
                OrganizationId = result.Role.OrganizationId,
                IsDefault = result.Role.IsDefault
            } : null
        };

        return Ok(new BaseResponse<CourseTabApprovalDto>
        {
            StatusCode = 200,
            Message = "Approval updated successfully.",
            Result = resultDto
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.CourseTabApprovals.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Approval not found."
            });
        }

        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.CourseTabApprovals.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Approval deleted successfully.",
            Result = true
        });
    }
}

