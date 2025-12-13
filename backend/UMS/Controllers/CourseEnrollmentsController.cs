using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Data;
using UMS.Services;
using Microsoft.EntityFrameworkCore;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CourseEnrollmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly OrganizationAccessService _orgAccessService;

    public CourseEnrollmentsController(ApplicationDbContext context, OrganizationAccessService orgAccessService)
    {
        _context = context;
        _orgAccessService = orgAccessService;
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetEnrollmentsByCourse(int courseId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var skip = (page - 1) * pageSize;

        // Get organization filter
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();

        var query = _context.CourseEnrollments
            .Include(ce => ce.Course)
            .Include(ce => ce.User)
            .Where(ce => ce.CourseId == courseId && !ce.IsDeleted);

        // Apply organization filter if not SuperAdmin
        if (orgFilter.HasValue)
        {
            query = query.Where(ce => ce.Course.OrganizationId == orgFilter.Value);
        }

        var total = await query.CountAsync();
        var enrollments = await query
            .OrderByDescending(ce => ce.EnrollmentAt)
            .Skip(skip)
            .Take(pageSize)
            .ToListAsync();

        var enrollmentDtos = enrollments.Select(e => new CourseEnrollmentDto
        {
            Id = e.Id,
            CourseId = e.CourseId,
            UserId = e.UserId,
            EnrollmentAt = e.EnrollmentAt,
            IsActive = e.IsActive,
            FinalApproval = e.FinalApproval,
            Status = e.Status,
            User = new UserEnrollmentDto
            {
                Id = e.User.Id,
                FullName = e.User.FullName,
                Email = e.User.Email ?? "",
                UserName = e.User.UserName
            }
        }).ToList();

        var response = new BaseResponse<IEnumerable<CourseEnrollmentDto>>
        {
            StatusCode = 200,
            Message = "Enrollments retrieved successfully.",
            Result = enrollmentDtos,
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

    [HttpPost]
    public async Task<IActionResult> Enroll([FromBody] CreateEnrollmentDto dto)
    {
        // Get current user from token
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 401,
                Message = "User ID not found in token."
            });
        }

        // Check if course exists and is published
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == dto.CourseId && !c.IsDeleted);

        if (course == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 404,
                Message = "Course not found."
            });
        }

        if (course.Status != CourseStatus.Published)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Only published courses can be enrolled in."
            });
        }

        // Check if already enrolled
        var existingEnrollment = await _context.CourseEnrollments
            .FirstOrDefaultAsync(ce => ce.CourseId == dto.CourseId && ce.UserId == currentUserId && !ce.IsDeleted);

        if (existingEnrollment != null)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "You are already enrolled in this course."
            });
        }

        // Check available seats
        var enrollmentCount = await _context.CourseEnrollments
            .CountAsync(ce => ce.CourseId == dto.CourseId && !ce.IsDeleted && ce.IsActive);

        if (enrollmentCount >= course.AvailableSeats)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Course is full. No available seats."
            });
        }

        // Create enrollment
        var enrollment = new CourseEnrollment
        {
            CourseId = dto.CourseId,
            UserId = currentUserId,
            EnrollmentAt = DateTime.Now,
            IsActive = true,
            CreatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System"
        };

        _context.CourseEnrollments.Add(enrollment);
        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(enrollment)
            .Reference(e => e.Course)
            .LoadAsync();
        await _context.Entry(enrollment)
            .Reference(e => e.User)
            .LoadAsync();

        var enrollmentDto = new CourseEnrollmentDto
        {
            Id = enrollment.Id,
            CourseId = enrollment.CourseId,
            UserId = enrollment.UserId,
            EnrollmentAt = enrollment.EnrollmentAt,
            IsActive = enrollment.IsActive,
            FinalApproval = enrollment.FinalApproval,
            Status = enrollment.Status,
            User = new UserEnrollmentDto
            {
                Id = enrollment.User.Id,
                FullName = enrollment.User.FullName,
                Email = enrollment.User.Email ?? "",
                UserName = enrollment.User.UserName
            }
        };

        return CreatedAtAction(nameof(GetEnrollmentsByCourse), new { courseId = dto.CourseId }, new BaseResponse<CourseEnrollmentDto>
        {
            StatusCode = 201,
            Message = "Successfully enrolled in course.",
            Result = enrollmentDto
        });
    }

    [HttpGet("check/{courseId}")]
    public async Task<IActionResult> CheckEnrollment(int courseId)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(currentUserId))
        {
            return Ok(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 200,
                Message = "User not authenticated.",
                Result = null
            });
        }

        var enrollment = await _context.CourseEnrollments
            .Include(e => e.User)
            .FirstOrDefaultAsync(ce => ce.CourseId == courseId && ce.UserId == currentUserId && !ce.IsDeleted);

        if (enrollment == null)
        {
            return Ok(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 200,
                Message = "Enrollment status retrieved successfully.",
                Result = null
            });
        }

        var enrollmentDto = new CourseEnrollmentDto
        {
            Id = enrollment.Id,
            CourseId = enrollment.CourseId,
            UserId = enrollment.UserId,
            EnrollmentAt = enrollment.EnrollmentAt,
            IsActive = enrollment.IsActive,
            FinalApproval = enrollment.FinalApproval,
            Status = enrollment.Status,
            User = new UserEnrollmentDto
            {
                Id = enrollment.User.Id,
                FullName = enrollment.User.FullName,
                Email = enrollment.User.Email ?? "",
                UserName = enrollment.User.UserName
            }
        };

        return Ok(new BaseResponse<CourseEnrollmentDto>
        {
            StatusCode = 200,
            Message = "Enrollment status retrieved successfully.",
            Result = enrollmentDto
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelEnrollment(int id)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new BaseResponse<bool>
            {
                StatusCode = 401,
                Message = "User ID not found in token."
            });
        }

        var enrollment = await _context.CourseEnrollments
            .FirstOrDefaultAsync(ce => ce.Id == id && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        // Check if user owns this enrollment or is admin
        var isAdmin = User.IsInRole("SuperAdmin") || User.HasClaim("Role", "SuperAdmin");
        if (!isAdmin && enrollment.UserId != currentUserId)
        {
            return Forbid();
        }

        enrollment.IsDeleted = true;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        await _context.SaveChangesAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Enrollment cancelled successfully.",
            Result = true
        });
    }

    [HttpPatch("{id}/approve")]
    public async Task<IActionResult> ApproveEnrollment(int id)
    {
        var enrollment = await _context.CourseEnrollments
            .FirstOrDefaultAsync(ce => ce.Id == id && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        enrollment.FinalApproval = true;
        enrollment.Status = EnrollmentStatus.Approve;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(enrollment)
            .Reference(e => e.User)
            .LoadAsync();

        var enrollmentDto = new CourseEnrollmentDto
        {
            Id = enrollment.Id,
            CourseId = enrollment.CourseId,
            UserId = enrollment.UserId,
            EnrollmentAt = enrollment.EnrollmentAt,
            IsActive = enrollment.IsActive,
            FinalApproval = enrollment.FinalApproval,
            Status = enrollment.Status,
            User = new UserEnrollmentDto
            {
                Id = enrollment.User.Id,
                FullName = enrollment.User.FullName,
                Email = enrollment.User.Email ?? "",
                UserName = enrollment.User.UserName
            }
        };

        return Ok(new BaseResponse<CourseEnrollmentDto>
        {
            StatusCode = 200,
            Message = "Enrollment approved successfully.",
            Result = enrollmentDto
        });
    }

    [HttpPatch("{id}/reject")]
    public async Task<IActionResult> RejectEnrollment(int id)
    {
        var enrollment = await _context.CourseEnrollments
            .FirstOrDefaultAsync(ce => ce.Id == id && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        enrollment.FinalApproval = true;
        enrollment.Status = EnrollmentStatus.Reject;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(enrollment)
            .Reference(e => e.User)
            .LoadAsync();

        var enrollmentDto = new CourseEnrollmentDto
        {
            Id = enrollment.Id,
            CourseId = enrollment.CourseId,
            UserId = enrollment.UserId,
            EnrollmentAt = enrollment.EnrollmentAt,
            IsActive = enrollment.IsActive,
            FinalApproval = enrollment.FinalApproval,
            Status = enrollment.Status,
            User = new UserEnrollmentDto
            {
                Id = enrollment.User.Id,
                FullName = enrollment.User.FullName,
                Email = enrollment.User.Email ?? "",
                UserName = enrollment.User.UserName
            }
        };

        return Ok(new BaseResponse<CourseEnrollmentDto>
        {
            StatusCode = 200,
            Message = "Enrollment rejected successfully.",
            Result = enrollmentDto
        });
    }

    [HttpPatch("{id}/excuse")]
    public async Task<IActionResult> ExcuseEnrollment(int id)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 401,
                Message = "User ID not found in token."
            });
        }

        var enrollment = await _context.CourseEnrollments
            .Include(e => e.Course)
            .ThenInclude(c => c.CourseTab)
            .FirstOrDefaultAsync(ce => ce.Id == id && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        // Check if user owns this enrollment
        if (enrollment.UserId != currentUserId)
        {
            return Forbid();
        }

        // Check if enrollment is approved
        if (enrollment.Status != EnrollmentStatus.Approve)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Only approved enrollments can be excused."
            });
        }

        // Check if course has start date
        if (!enrollment.Course.StartDateTime.HasValue)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Course start date is not set."
            });
        }

        // Check if excuse time is available
        var courseTab = enrollment.Course.CourseTab;
        if (courseTab == null || !courseTab.ExcuseTimeHours.HasValue || courseTab.ExcuseTimeHours.Value <= 0)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Excuse time is not configured for this course."
            });
        }

        // Check if current time is before the excuse deadline
        var courseStartTime = enrollment.Course.StartDateTime!.Value;
        var excuseDeadline = courseStartTime.AddHours(-courseTab!.ExcuseTimeHours!.Value);
        var currentTime = DateTime.Now;

        if (currentTime >= excuseDeadline)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = $"You can only excuse yourself at least {courseTab.ExcuseTimeHours.Value} hours before the course starts."
            });
        }

        enrollment.Status = EnrollmentStatus.Excuse;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(enrollment)
            .Reference(e => e.User)
            .LoadAsync();

        var enrollmentDto = new CourseEnrollmentDto
        {
            Id = enrollment.Id,
            CourseId = enrollment.CourseId,
            UserId = enrollment.UserId,
            EnrollmentAt = enrollment.EnrollmentAt,
            IsActive = enrollment.IsActive,
            FinalApproval = enrollment.FinalApproval,
            Status = enrollment.Status,
            User = new UserEnrollmentDto
            {
                Id = enrollment.User.Id,
                FullName = enrollment.User.FullName,
                Email = enrollment.User.Email ?? "",
                UserName = enrollment.User.UserName
            }
        };

        return Ok(new BaseResponse<CourseEnrollmentDto>
        {
            StatusCode = 200,
            Message = "Enrollment excused successfully.",
            Result = enrollmentDto
        });
    }
}

