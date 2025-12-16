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
using System.Text;
using System.Linq.Expressions;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CourseEnrollmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly OrganizationAccessService _orgAccessService;
    private readonly EmailService _emailService;
    private readonly ILogger<CourseEnrollmentsController> _logger;

    public CourseEnrollmentsController(
        ApplicationDbContext context, 
        OrganizationAccessService orgAccessService,
        EmailService emailService,
        ILogger<CourseEnrollmentsController> logger)
    {
        _context = context;
        _orgAccessService = orgAccessService;
        _emailService = emailService;
        _logger = logger;
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetEnrollmentsByCourse(int courseId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var skip = (page - 1) * pageSize;

        // Get organization filter
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();

        // First, get the course to find its CourseTabId
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted);
        
        if (course == null)
        {
            return NotFound(new BaseResponse<IEnumerable<CourseEnrollmentDto>>
            {
                StatusCode = 404,
                Message = "Course not found."
            });
        }

        // Get all active CourseTabApproval IDs for the course's CourseTab
        var activeApprovalIds = await _context.CourseTabApprovals
            .Where(cta => cta.CourseTabId == course.CourseTabId && !cta.IsDeleted && cta.IsActive)
            .Select(cta => cta.Id)
            .ToListAsync();

        var query = _context.CourseEnrollments
            .Include(ce => ce.Course)
                .ThenInclude(c => c.CourseTab)
            .Include(ce => ce.User)
                .ThenInclude(u => u.Organization)
            .Include(ce => ce.User)
                .ThenInclude(u => u.Department)
            .Include(ce => ce.User)
                .ThenInclude(u => u.JobTitle)
            .Include(ce => ce.ApprovalSteps)
                .ThenInclude(a => a.CourseTabApproval)
                    .ThenInclude(cta => cta.Role)
            .AsSplitQuery()
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

        // Auto-sync approval steps if needed
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        var syncedAny = false;
        
        foreach (var enrollment in enrollments.Where(e => !e.FinalApproval))
        {
            var existingStepIds = enrollment.ApprovalSteps
                .Where(a => !a.IsDeleted)
                .Select(a => a.CourseTabApprovalId)
                .ToHashSet();

            // Check if this enrollment needs sync
            if (existingStepIds.Count != activeApprovalIds.Count)
            {
                // Get the full approval configurations
                var approvalConfigs = await _context.CourseTabApprovals
                    .Where(cta => activeApprovalIds.Contains(cta.Id))
                    .ToListAsync();

                // Add missing approval steps
                foreach (var approvalId in activeApprovalIds)
                {
                    if (!existingStepIds.Contains(approvalId))
                    {
                        var newStep = new CourseEnrollmentApproval
                        {
                            CourseEnrollmentId = enrollment.Id,
                            CourseTabApprovalId = approvalId,
                            IsApproved = false,
                            IsRejected = false,
                            CreatedBy = currentUser,
                            CreatedOn = DateTime.Now
                        };
                        _context.CourseEnrollmentApprovals.Add(newStep);
                        syncedAny = true;
                    }
                }

                // Remove obsolete approval steps
                foreach (var step in enrollment.ApprovalSteps.Where(a => !a.IsDeleted))
                {
                    if (!activeApprovalIds.Contains(step.CourseTabApprovalId))
                    {
                        step.IsDeleted = true;
                        step.UpdatedAt = DateTime.Now;
                        step.UpdatedBy = currentUser;
                        syncedAny = true;
                    }
                }
            }
        }

        if (syncedAny)
        {
            await _context.SaveChangesAsync();
            
            // Reload enrollments to get the updated approval steps
            enrollments = await query
                .OrderByDescending(ce => ce.EnrollmentAt)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync();
        }

        var enrollmentDtos = enrollments.Select(e =>
        {
            var activeApprovalIds = _context.CourseTabApprovals
                .Where(cta => cta.CourseTabId == e.Course.CourseTabId && !cta.IsDeleted && cta.IsActive)
                .Select(cta => cta.Id)
                .ToList();

            // Get ALL approval steps (including Head Approval)
            // The frontend will handle hiding Head Approval steps in the UI
            // But we need to include them in the response so the frontend can check if previous steps are completed
            var approvalSteps = e.ApprovalSteps
                .Where(a => !a.IsDeleted && 
                           activeApprovalIds.Contains(a.CourseTabApprovalId) && 
                           a.CourseTabApproval != null)
                .OrderBy(a => a.CourseTabApproval != null ? a.CourseTabApproval.ApprovalOrder : 0)
                .Select(a => new CourseEnrollmentApprovalDto
                {
                    Id = a.Id,
                    CourseEnrollmentId = a.CourseEnrollmentId,
                    CourseTabApprovalId = a.CourseTabApprovalId,
                    ApprovedBy = a.ApprovedBy,
                    ApprovedAt = a.ApprovedAt,
                    IsApproved = a.IsApproved,
                    IsRejected = a.IsRejected,
                    Comments = a.Comments,
                    ApprovedByUser = !string.IsNullOrEmpty(a.ApprovedBy) ? _context.Users
                        .Where(u => u.Id == a.ApprovedBy)
                        .Select(u => new UserEnrollmentDto
                        {
                            Id = u.Id,
                            FullName = u.FullName,
                            Email = u.Email,
                            UserName = u.UserName,
                            OrganizationId = u.OrganizationId,
                            OrganizationName = u.Organization != null ? u.Organization.Name : null,
                            OrganizationIsMain = u.Organization != null ? u.Organization.IsMain : null,
                            DepartmentId = u.DepartmentId,
                            DepartmentName = u.Department != null ? u.Department.NameEn : null,
                            JobTitle = u.JobTitle != null ? u.JobTitle.NameEn : null
                        }).FirstOrDefault() : null,
                    CourseTabApproval = a.CourseTabApproval != null ? new CourseTabApprovalDto
                    {
                        Id = a.CourseTabApproval.Id,
                        CourseTabId = a.CourseTabApproval.CourseTabId,
                        ApprovalOrder = a.CourseTabApproval.ApprovalOrder,
                        IsHeadApproval = a.CourseTabApproval.IsHeadApproval,
                        RoleId = a.CourseTabApproval.RoleId,
                        Role = a.CourseTabApproval.Role != null ? new RoleDto
                        {
                            Id = a.CourseTabApproval.Role.Id,
                            Name = a.CourseTabApproval.Role.Name,
                            ApplyToAllOrganizations = a.CourseTabApproval.Role.ApplyToAllOrganizations,
                            OrganizationId = a.CourseTabApproval.Role.OrganizationId,
                            IsDefault = a.CourseTabApproval.Role.IsDefault
                        } : null
                    } : null
                }).ToList();

            return new CourseEnrollmentDto
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
                    UserName = e.User.UserName,
                    OrganizationId = e.User.OrganizationId,
                    OrganizationName = e.User.Organization?.Name,
                    OrganizationIsMain = e.User.Organization?.IsMain,
                    DepartmentId = e.User.DepartmentId,
                    DepartmentName = e.User.Department != null ? (e.User.Department.NameEn ?? e.User.Department.NameAr) : null,
                    JobTitle = e.User.JobTitle != null ? (e.User.JobTitle.NameEn ?? e.User.JobTitle.NameAr) : null
                },
                ApprovalSteps = approvalSteps,
                // Add diagnostic info about missing steps
                _Debug = new
                {
                    TotalApprovalSteps = e.ApprovalSteps.Count,
                    ActiveApprovalSteps = approvalSteps.Count,
                    ExpectedActiveApprovals = activeApprovalIds.Count,
                    NeedsSyncIfMismatch = approvalSteps.Count != activeApprovalIds.Count && !e.FinalApproval
                }
            };
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

    [HttpGet("pending-head-approvals")]
    public async Task<IActionResult> GetPendingHeadApprovals([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var skip = (page - 1) * pageSize;

        // Get current user
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new BaseResponse<IEnumerable<CourseEnrollmentDto>>
            {
                StatusCode = 401,
                Message = "User ID not found in token."
            });
        }

        // Get current user's department
        var currentUser = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == currentUserId && !u.IsDeleted);

        if (currentUser == null || !currentUser.DepartmentId.HasValue)
        {
            return Ok(new BaseResponse<IEnumerable<CourseEnrollmentDto>>
            {
                StatusCode = 200,
                Message = "No department assigned to current user.",
                Result = new List<CourseEnrollmentDto>(),
                Total = 0,
                Pagination = new Pagination
                {
                    CurrentPage = page,
                    PageSize = pageSize,
                    Total = 0
                }
            });
        }

        // Check if user is Head of the department
        if (currentUser.DepartmentRole != "Head")
        {
            return Ok(new BaseResponse<IEnumerable<CourseEnrollmentDto>>
            {
                StatusCode = 200,
                Message = "User is not a department head.",
                Result = new List<CourseEnrollmentDto>(),
                Total = 0,
                Pagination = new Pagination
                {
                    CurrentPage = page,
                    PageSize = pageSize,
                    Total = 0
                }
            });
        }

        var userDepartmentId = currentUser.DepartmentId.Value;

        // Get organization filter
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();

        // Query for enrollments that:
        // 1. Are pending (not finalized)
        // 2. Have a head approval step that is not yet approved/rejected
        // 3. User belongs to the same department as the current user
        // 4. All previous approval steps are completed
        var query = _context.CourseEnrollments
            .Include(ce => ce.Course)
                .ThenInclude(c => c.CourseTab)
            .Include(ce => ce.User)
                .ThenInclude(u => u.Organization)
            .Include(ce => ce.User)
                .ThenInclude(u => u.Department)
            .Include(ce => ce.User)
                .ThenInclude(u => u.JobTitle)
            .Include(ce => ce.ApprovalSteps)
                .ThenInclude(a => a.CourseTabApproval)
                    .ThenInclude(cta => cta.Role)
            .AsSplitQuery()
            .Where(ce => !ce.IsDeleted 
                      && !ce.FinalApproval 
                      && ce.Status == EnrollmentStatus.Pending
                      && ce.User.DepartmentId == userDepartmentId
                      && ce.UserId != currentUserId);

        // Apply organization filter if not SuperAdmin
        // Filter by the USER's organization (the department head's organization), not the Course's.
        // This allows heads to see approvals for their staff even if the course is from another organization (public course).
        if (orgFilter.HasValue)
        {
            query = query.Where(ce => ce.User.OrganizationId == orgFilter.Value);
        }

        var enrollments = await query
            .OrderByDescending(ce => ce.EnrollmentAt)
            .ToListAsync();

        // Filter enrollments that have a pending head approval step
        var filteredEnrollments = enrollments.Where(e =>
        {
            // Get all active approval steps for this enrollment's course tab
            var activeApprovalIds = _context.CourseTabApprovals
                .Where(cta => cta.CourseTabId == e.Course.CourseTabId && !cta.IsDeleted && cta.IsActive)
                .Select(cta => cta.Id)
                .ToList();

            var approvalSteps = e.ApprovalSteps
                .Where(a => !a.IsDeleted && activeApprovalIds.Contains(a.CourseTabApprovalId))
                .OrderBy(a => a.CourseTabApproval.ApprovalOrder)
                .ToList();

            // Find the head approval step
            var headApprovalStep = approvalSteps.FirstOrDefault(a => a.CourseTabApproval.IsHeadApproval);
            
            if (headApprovalStep == null || headApprovalStep.IsApproved || headApprovalStep.IsRejected)
            {
                return false; // No head approval needed or already processed
            }

            // Check if all previous steps are approved
            var previousSteps = approvalSteps
                .Where(a => a.CourseTabApproval.ApprovalOrder < headApprovalStep.CourseTabApproval.ApprovalOrder)
                .ToList();

            return previousSteps.All(a => a.IsApproved);
        }).ToList();

        var total = filteredEnrollments.Count;
        var paginatedEnrollments = filteredEnrollments
            .Skip(skip)
            .Take(pageSize)
            .ToList();

        var enrollmentDtos = paginatedEnrollments.Select(e =>
        {
            var activeApprovalIds = _context.CourseTabApprovals
                .Where(cta => cta.CourseTabId == e.Course.CourseTabId && !cta.IsDeleted && cta.IsActive)
                .Select(cta => cta.Id)
                .ToList();

            return new CourseEnrollmentDto
            {
                Id = e.Id,
                CourseId = e.CourseId,
                UserId = e.UserId,
                EnrollmentAt = e.EnrollmentAt,
                IsActive = e.IsActive,
                FinalApproval = e.FinalApproval,
                Status = e.Status,
                Course = new CourseDto
                {
                    Id = e.Course.Id,
                    CourseTitle = e.Course.CourseTitle,
                    CourseTitleAr = e.Course.CourseTitleAr,
                    CourseTabId = e.Course.CourseTabId,
                    StartDateTime = e.Course.StartDateTime,
                    EndDateTime = e.Course.EndDateTime
                },
                User = new UserEnrollmentDto
                {
                    Id = e.User.Id,
                    FullName = e.User.FullName,
                    Email = e.User.Email ?? "",
                    UserName = e.User.UserName,
                    OrganizationId = e.User.OrganizationId,
                    OrganizationName = e.User.Organization?.Name,
                    OrganizationIsMain = e.User.Organization?.IsMain,
                    DepartmentId = e.User.DepartmentId,
                    DepartmentName = e.User.Department != null ? (e.User.Department.NameEn ?? e.User.Department.NameAr) : null,
                    JobTitle = e.User.JobTitle != null ? (e.User.JobTitle.NameEn ?? e.User.JobTitle.NameAr) : null
                },
                ApprovalSteps = e.ApprovalSteps
                    .Where(a => !a.IsDeleted && activeApprovalIds.Contains(a.CourseTabApprovalId) && a.CourseTabApproval != null)
                    .OrderBy(a => a.CourseTabApproval != null ? a.CourseTabApproval.ApprovalOrder : 0)
                    .Select(a => new CourseEnrollmentApprovalDto
                    {
                        Id = a.Id,
                        CourseEnrollmentId = a.CourseEnrollmentId,
                        CourseTabApprovalId = a.CourseTabApprovalId,
                        ApprovedBy = a.ApprovedBy,
                        ApprovedAt = a.ApprovedAt,
                        IsApproved = a.IsApproved,
                        IsRejected = a.IsRejected,
                        Comments = a.Comments,
                        CourseTabApproval = a.CourseTabApproval != null ? new CourseTabApprovalDto
                        {
                            Id = a.CourseTabApproval.Id,
                            CourseTabId = a.CourseTabApproval.CourseTabId,
                            ApprovalOrder = a.CourseTabApproval.ApprovalOrder,
                            IsHeadApproval = a.CourseTabApproval.IsHeadApproval,
                            RoleId = a.CourseTabApproval.RoleId,
                            Role = a.CourseTabApproval.Role != null ? new RoleDto
                            {
                                Id = a.CourseTabApproval.Role.Id,
                                Name = a.CourseTabApproval.Role.Name,
                                ApplyToAllOrganizations = a.CourseTabApproval.Role.ApplyToAllOrganizations,
                                OrganizationId = a.CourseTabApproval.Role.OrganizationId,
                                IsDefault = a.CourseTabApproval.Role.IsDefault
                            } : null
                        } : null
                    }).ToList()
            };
        }).ToList();

        var response = new BaseResponse<IEnumerable<CourseEnrollmentDto>>
        {
            StatusCode = 200,
            Message = "Pending head approvals retrieved successfully.",
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

        // Load course with CourseTab to get approval requirements (needed for both new and restored enrollments)
        var courseWithTab = await _context.Courses
            .Include(c => c.CourseTab)
            .FirstOrDefaultAsync(c => c.Id == dto.CourseId && !c.IsDeleted);

        if (courseWithTab?.CourseTab == null)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Course tab not found for this course."
            });
        }

        // Check if already enrolled (including soft-deleted ones due to unique index)
        var existingEnrollment = await _context.CourseEnrollments
            .FirstOrDefaultAsync(ce => ce.CourseId == dto.CourseId && ce.UserId == currentUserId);

        if (existingEnrollment != null)
        {
            // If the enrollment exists but is soft-deleted, restore it instead of creating a new one
            if (existingEnrollment.IsDeleted)
            {
                // Load existing approval steps
                var oldApprovalSteps = await _context.CourseEnrollmentApprovals
                    .Where(a => a.CourseEnrollmentId == existingEnrollment.Id)
                    .ToListAsync();

                // Delete all old approval steps (both soft-deleted and active ones)
                // This ensures a clean slate when re-enrolling
                if (oldApprovalSteps.Any())
                {
                    _context.CourseEnrollmentApprovals.RemoveRange(oldApprovalSteps);
                }

                // Check if course tab has approval steps
                var activeApprovalSteps = await _context.CourseTabApprovals
                    .Where(cta => cta.CourseTabId == courseWithTab.CourseTabId && !cta.IsDeleted && cta.IsActive)
                    .CountAsync();

                existingEnrollment.IsDeleted = false;
                existingEnrollment.IsActive = true;
                existingEnrollment.EnrollmentAt = DateTime.Now;
                existingEnrollment.UpdatedAt = DateTime.Now;
                existingEnrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
                
                // If no approval steps, auto-approve; otherwise reset to pending
                if (activeApprovalSteps == 0)
                {
                    existingEnrollment.FinalApproval = true;
                    existingEnrollment.Status = EnrollmentStatus.Approve;
                }
                else
                {
                    existingEnrollment.FinalApproval = false;
                    existingEnrollment.Status = EnrollmentStatus.Pending;
                }

                await _context.SaveChangesAsync();

                // Load related data for response
                await _context.Entry(existingEnrollment)
                    .Reference(e => e.Course)
                    .LoadAsync();
                await _context.Entry(existingEnrollment)
                    .Reference(e => e.User)
                    .LoadAsync();
                await _context.Entry(existingEnrollment.User)
                    .Reference(u => u.Organization)
                    .LoadAsync();
                await _context.Entry(existingEnrollment.User)
                    .Reference(u => u.Department)
                    .LoadAsync();
                await _context.Entry(existingEnrollment.User)
                    .Reference(u => u.JobTitle)
                    .LoadAsync();

                var restoredEnrollmentDto = new CourseEnrollmentDto
                {
                    Id = existingEnrollment.Id,
                    CourseId = existingEnrollment.CourseId,
                    UserId = existingEnrollment.UserId,
                    EnrollmentAt = existingEnrollment.EnrollmentAt,
                    IsActive = existingEnrollment.IsActive,
                    FinalApproval = existingEnrollment.FinalApproval,
                    Status = existingEnrollment.Status,
                    User = new UserEnrollmentDto
                    {
                        Id = existingEnrollment.User.Id,
                        FullName = existingEnrollment.User.FullName,
                        Email = existingEnrollment.User.Email ?? "",
                        UserName = existingEnrollment.User.UserName,
                        OrganizationId = existingEnrollment.User.OrganizationId,
                        OrganizationName = existingEnrollment.User.Organization?.Name,
                        OrganizationIsMain = existingEnrollment.User.Organization?.IsMain,
                        DepartmentId = existingEnrollment.User.DepartmentId,
                        DepartmentName = existingEnrollment.User.Department != null ? (existingEnrollment.User.Department.NameEn ?? existingEnrollment.User.Department.NameAr) : null,
                        JobTitle = existingEnrollment.User.JobTitle != null ? (existingEnrollment.User.JobTitle.NameEn ?? existingEnrollment.User.JobTitle.NameAr) : null
                    }
                };

                return Ok(new BaseResponse<CourseEnrollmentDto>
                {
                    StatusCode = 200,
                    Message = "Enrollment restored successfully.",
                    Result = restoredEnrollmentDto
                });
            }
            else
            {
                return BadRequest(new BaseResponse<CourseEnrollmentDto>
                {
                    StatusCode = 400,
                    Message = "You are already enrolled in this course."
                });
            }
        }

        // Check available seats - count only approved enrollments
        var approvedEnrollmentCount = await _context.CourseEnrollments
            .CountAsync(ce => ce.CourseId == dto.CourseId && !ce.IsDeleted && ce.IsActive && ce.Status == EnrollmentStatus.Approve);

        var availableSeats = course.AvailableSeats - approvedEnrollmentCount;

        if (availableSeats < 1)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "No more seats available. The course is full."
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

        // Initialize approval steps based on CourseTabApprovals
        var courseTabApprovals = await _context.CourseTabApprovals
            .Include(cta => cta.Role)
            .Where(cta => cta.CourseTabId == courseWithTab.CourseTabId && !cta.IsDeleted && cta.IsActive)
            .OrderBy(cta => cta.ApprovalOrder)
            .ToListAsync();

        // If no approval steps, auto-approve the enrollment
        if (courseTabApprovals.Count == 0)
        {
            enrollment.FinalApproval = true;
            enrollment.Status = EnrollmentStatus.Approve;
            enrollment.UpdatedAt = DateTime.Now;
            enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        }
        else
        {
            // Create approval steps
            foreach (var tabApproval in courseTabApprovals)
            {
                var enrollmentApproval = new CourseEnrollmentApproval
                {
                    CourseEnrollmentId = enrollment.Id,
                    CourseTabApprovalId = tabApproval.Id,
                    IsApproved = false,
                    IsRejected = false,
                    CreatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System",
                    CreatedOn = DateTime.Now
                };
                _context.CourseEnrollmentApprovals.Add(enrollmentApproval);
            }
        }

        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(enrollment)
            .Reference(e => e.Course)
            .LoadAsync();
        await _context.Entry(enrollment)
            .Reference(e => e.User)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.Organization)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.Department)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.JobTitle)
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
                UserName = enrollment.User.UserName,
                OrganizationId = enrollment.User.OrganizationId,
                OrganizationName = enrollment.User.Organization?.Name,
                OrganizationIsMain = enrollment.User.Organization?.IsMain,
                DepartmentId = enrollment.User.DepartmentId,
                DepartmentName = enrollment.User.Department != null ? (enrollment.User.Department.NameEn ?? enrollment.User.Department.NameAr) : null,
                JobTitle = enrollment.User.JobTitle != null ? (enrollment.User.JobTitle.NameEn ?? enrollment.User.JobTitle.NameAr) : null
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
    public async Task<IActionResult> DeleteEnrollment(int id)
    {
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

        // Mark enrollment as deleted
        enrollment.IsDeleted = true;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        // Load and mark all approval steps as deleted (query them separately to ensure they're tracked)
        var approvalSteps = await _context.CourseEnrollmentApprovals
            .Where(a => a.CourseEnrollmentId == id && !a.IsDeleted)
            .ToListAsync();

        if (approvalSteps.Any())
        {
            foreach (var approvalStep in approvalSteps)
            {
                approvalStep.IsDeleted = true;
                approvalStep.UpdatedAt = DateTime.Now;
                approvalStep.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            }
        }

        await _context.SaveChangesAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Enrollment deleted successfully.",
            Result = true
        });
    }

    [HttpPost("approve-step")]
    public async Task<IActionResult> ApproveEnrollmentStep([FromBody] ApproveEnrollmentStepDto dto)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 401,
                Message = "User ID not found in token."
            });
        }

        var enrollment = await _context.CourseEnrollments
            .Include(e => e.User)
            .Include(e => e.ApprovalSteps)
                .ThenInclude(a => a.CourseTabApproval)
                    .ThenInclude(cta => cta.Role)
            .FirstOrDefaultAsync(ce => ce.Id == dto.CourseEnrollmentId && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        // Check if enrollment is already finalized
        if (enrollment.FinalApproval)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 400,
                Message = "Enrollment is already finalized."
            });
        }

        // Find the approval step
        var approvalStep = enrollment.ApprovalSteps
            .FirstOrDefault(a => a.CourseTabApprovalId == dto.CourseTabApprovalId && !a.IsDeleted);

        if (approvalStep == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 404,
                Message = "Approval step not found."
            });
        }

        // Check if this step is already approved or rejected
        if (approvalStep.IsApproved || approvalStep.IsRejected)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 400,
                Message = "This approval step is already processed."
            });
        }

        // Check if previous steps are approved (approvals must be done in order)
        var previousSteps = enrollment.ApprovalSteps
            .Where(a => !a.IsDeleted && 
                   a.CourseTabApproval.ApprovalOrder < approvalStep.CourseTabApproval.ApprovalOrder)
            .OrderBy(a => a.CourseTabApproval.ApprovalOrder)
            .ToList();

        var allPreviousApproved = previousSteps.All(a => a.IsApproved);
        if (!allPreviousApproved)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 400,
                Message = "Previous approval steps must be completed first."
            });
        }

        // Avoid self-approval
        if (enrollment.UserId == currentUserId)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 400,
                Message = "You cannot approve your own enrollment."
            });
        }

        // Check permission to approve
        var currentUser = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == currentUserId && !u.IsDeleted);

        if (currentUser == null)
        {
            return Unauthorized(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 401,
                Message = "User not found."
            });
        }

        // Check Head Approval
        if (approvalStep.CourseTabApproval.IsHeadApproval)
        {
            if (currentUser.DepartmentId != enrollment.User.DepartmentId)
            {
                return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
                {
                    StatusCode = 403,
                    Message = "You must be in the same department to provide Head Approval."
                });
            }
            if (currentUser.DepartmentRole != "Head")
            {
                return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
                {
                    StatusCode = 403,
                    Message = "You must be a Department Head to approve."
                });
            }
        }
        // Check Role Approval
        else if (approvalStep.CourseTabApproval.RoleId.HasValue)
        {
            // Check if the user has this role
            var hasRole = currentUser.UserRoles.Any(ur => ur.RoleId == approvalStep.CourseTabApproval.RoleId.Value);
            
            if (!hasRole)
            {
                return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
                {
                    StatusCode = 403,
                    Message = "You do not have the required role to approve this step."
                });
            }
        }

        // Approve the step
        approvalStep.IsApproved = true;
        approvalStep.ApprovedBy = currentUserId;
        approvalStep.ApprovedAt = DateTime.Now;
        approvalStep.Comments = dto.Comments;
        approvalStep.UpdatedAt = DateTime.Now;
        approvalStep.UpdatedBy = currentUserId;

        // Check if all steps are approved
        var allSteps = enrollment.ApprovalSteps
            .Where(a => !a.IsDeleted)
            .OrderBy(a => a.CourseTabApproval.ApprovalOrder)
            .ToList();

        var allApproved = allSteps.All(a => a.IsApproved);
        if (allApproved)
        {
            enrollment.FinalApproval = true;
            enrollment.Status = EnrollmentStatus.Approve;
            enrollment.UpdatedAt = DateTime.Now;
            enrollment.UpdatedBy = currentUserId;
        }

        await _context.SaveChangesAsync();


        // Send confirmation email if final approval is granted and email hasn't been sent yet
        if (allApproved && !enrollment.ConfirmationEmailSent)
        {
            try
            {
                _logger.LogInformation($"Attempting to send confirmation email for enrollment {enrollment.Id}");
                
                // Ensure User is loaded
                if (enrollment.User == null)
                {
                    await _context.Entry(enrollment).Reference(e => e.User).LoadAsync();
                }

                // Load course and location details
                var course = await _context.Courses
                    .Include(c => c.Organization)
                    .Include(c => c.Location)
                    .FirstOrDefaultAsync(c => c.Id == enrollment.CourseId);

                if (course == null)
                {
                    _logger.LogWarning($"Course not found for enrollment {enrollment.Id}");
                }
                else if (enrollment.User == null)
                {
                    _logger.LogWarning($"User not found for enrollment {enrollment.Id}");
                }
                else if (string.IsNullOrEmpty(enrollment.User.Email))
                {
                    _logger.LogWarning($"User email is empty for enrollment {enrollment.Id}, User: {enrollment.User.FullName}");
                }
                else
                {
                    _logger.LogInformation($"Sending confirmation email to {enrollment.User.Email} for course {course.CourseTitle}");
                    
                    var emailSent = await _emailService.SendCourseApprovalConfirmationAsync(
                        enrollment.User.Email,
                        enrollment.User.FullName,
                        course.CourseTitle,
                        course.Description,
                        course.StartDateTime,
                        course.EndDateTime,
                        course.Location?.Name,
                        course.Organization?.Name ?? "Ministry of Oil"
                    );

                    if (emailSent)
                    {
                        _logger.LogInformation($"Confirmation email sent successfully for enrollment {enrollment.Id}");
                        enrollment.ConfirmationEmailSent = true;
                        await _context.SaveChangesAsync();
                    }
                    else
                    {
                        _logger.LogWarning($"Email service returned false for enrollment {enrollment.Id}");
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the approval
                // The email can be resent later if needed
                _logger.LogError(ex, $"Failed to send confirmation email for enrollment {enrollment.Id}: {ex.Message}");
            }
        }
        else if (allApproved && enrollment.ConfirmationEmailSent)
        {
            _logger.LogInformation($"Confirmation email already sent for enrollment {enrollment.Id}");
        }


        // Load related data for response
        await _context.Entry(approvalStep)
            .Reference(a => a.CourseTabApproval)
                .LoadAsync();
        await _context.Entry(approvalStep.CourseTabApproval)
            .Reference(cta => cta.Role)
                .LoadAsync();

        var approvalDto = new CourseEnrollmentApprovalDto
        {
            Id = approvalStep.Id,
            CourseEnrollmentId = approvalStep.CourseEnrollmentId,
            CourseTabApprovalId = approvalStep.CourseTabApprovalId,
            ApprovedBy = approvalStep.ApprovedBy,
            ApprovedAt = approvalStep.ApprovedAt,
            IsApproved = approvalStep.IsApproved,
            IsRejected = approvalStep.IsRejected,
            Comments = approvalStep.Comments,
            CourseTabApproval = approvalStep.CourseTabApproval != null ? new CourseTabApprovalDto
            {
                Id = approvalStep.CourseTabApproval.Id,
                CourseTabId = approvalStep.CourseTabApproval.CourseTabId,
                ApprovalOrder = approvalStep.CourseTabApproval.ApprovalOrder,
                IsHeadApproval = approvalStep.CourseTabApproval.IsHeadApproval,
                RoleId = approvalStep.CourseTabApproval.RoleId,
                Role = approvalStep.CourseTabApproval.Role != null ? new RoleDto
                {
                    Id = approvalStep.CourseTabApproval.Role.Id,
                    Name = approvalStep.CourseTabApproval.Role.Name,
                    ApplyToAllOrganizations = approvalStep.CourseTabApproval.Role.ApplyToAllOrganizations,
                    OrganizationId = approvalStep.CourseTabApproval.Role.OrganizationId,
                    IsDefault = approvalStep.CourseTabApproval.Role.IsDefault
                } : null
            } : null
        };

        return Ok(new BaseResponse<CourseEnrollmentApprovalDto>
        {
            StatusCode = 200,
            Message = allApproved ? "Enrollment fully approved." : "Approval step completed.",
            Result = approvalDto
        });
    }

    [HttpPost("reject-step")]
    public async Task<IActionResult> RejectEnrollmentStep([FromBody] RejectEnrollmentStepDto dto)
    {
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(currentUserId))
        {
            return Unauthorized(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 401,
                Message = "User ID not found in token."
            });
        }

        var enrollment = await _context.CourseEnrollments
            .Include(e => e.User)
            .Include(e => e.ApprovalSteps)
                .ThenInclude(a => a.CourseTabApproval)
                    .ThenInclude(cta => cta.Role)
            .FirstOrDefaultAsync(ce => ce.Id == dto.CourseEnrollmentId && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        // Check if enrollment is already finalized
        if (enrollment.FinalApproval)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 400,
                Message = "Enrollment is already finalized."
            });
        }

        // Find the approval step
        var approvalStep = enrollment.ApprovalSteps
            .FirstOrDefault(a => a.CourseTabApprovalId == dto.CourseTabApprovalId && !a.IsDeleted);

        if (approvalStep == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 404,
                Message = "Approval step not found."
            });
        }

        // Check if this step is already approved or rejected
        if (approvalStep.IsApproved || approvalStep.IsRejected)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 400,
                Message = "This approval step is already processed."
            });
        }

        // Avoid self-rejection
        if (enrollment.UserId == currentUserId)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 400,
                Message = "You cannot reject your own enrollment."
            });
        }

        // Check permission to reject
        var currentUser = await _context.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == currentUserId && !u.IsDeleted);

        if (currentUser == null)
        {
            return Unauthorized(new BaseResponse<CourseEnrollmentApprovalDto>
            {
                StatusCode = 401,
                Message = "User not found."
            });
        }

        // Check Head Approval
        if (approvalStep.CourseTabApproval.IsHeadApproval)
        {
            if (currentUser.DepartmentId != enrollment.User.DepartmentId)
            {
                return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
                {
                    StatusCode = 403,
                    Message = "You must be in the same department to provide Head Approval."
                });
            }
            if (currentUser.DepartmentRole != "Head")
            {
                return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
                {
                    StatusCode = 403,
                    Message = "You must be a Department Head to reject."
                });
            }
        }
        // Check Role Approval
        else if (approvalStep.CourseTabApproval.RoleId.HasValue)
        {
            var hasRole = currentUser.UserRoles.Any(ur => ur.RoleId == approvalStep.CourseTabApproval.RoleId.Value);
            
            if (!hasRole)
            {
                return BadRequest(new BaseResponse<CourseEnrollmentApprovalDto>
                {
                    StatusCode = 403,
                    Message = "You do not have the required role to reject this step."
                });
            }
        }

        // Reject the step - this finalizes the enrollment as rejected
        approvalStep.IsRejected = true;
        approvalStep.ApprovedBy = currentUserId;
        approvalStep.ApprovedAt = DateTime.Now;
        approvalStep.Comments = dto.Comments;
        approvalStep.UpdatedAt = DateTime.Now;
        approvalStep.UpdatedBy = currentUserId;

        // Rejecting any step finalizes the enrollment as rejected
        enrollment.FinalApproval = true;
        enrollment.Status = EnrollmentStatus.Reject;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = currentUserId;

        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(approvalStep)
            .Reference(a => a.CourseTabApproval)
                .LoadAsync();
        await _context.Entry(approvalStep.CourseTabApproval)
            .Reference(cta => cta.Role)
                .LoadAsync();

        var approvalDto = new CourseEnrollmentApprovalDto
        {
            Id = approvalStep.Id,
            CourseEnrollmentId = approvalStep.CourseEnrollmentId,
            CourseTabApprovalId = approvalStep.CourseTabApprovalId,
            ApprovedBy = approvalStep.ApprovedBy,
            ApprovedAt = approvalStep.ApprovedAt,
            IsApproved = approvalStep.IsApproved,
            IsRejected = approvalStep.IsRejected,
            Comments = approvalStep.Comments,
            CourseTabApproval = approvalStep.CourseTabApproval != null ? new CourseTabApprovalDto
            {
                Id = approvalStep.CourseTabApproval.Id,
                CourseTabId = approvalStep.CourseTabApproval.CourseTabId,
                ApprovalOrder = approvalStep.CourseTabApproval.ApprovalOrder,
                IsHeadApproval = approvalStep.CourseTabApproval.IsHeadApproval,
                RoleId = approvalStep.CourseTabApproval.RoleId,
                Role = approvalStep.CourseTabApproval.Role != null ? new RoleDto
                {
                    Id = approvalStep.CourseTabApproval.Role.Id,
                    Name = approvalStep.CourseTabApproval.Role.Name,
                    ApplyToAllOrganizations = approvalStep.CourseTabApproval.Role.ApplyToAllOrganizations,
                    OrganizationId = approvalStep.CourseTabApproval.Role.OrganizationId,
                    IsDefault = approvalStep.CourseTabApproval.Role.IsDefault
                } : null
            } : null
        };

        return Ok(new BaseResponse<CourseEnrollmentApprovalDto>
        {
            StatusCode = 200,
            Message = "Enrollment rejected.",
            Result = approvalDto
        });
    }

    [HttpPost("{id}/resend-confirmation")]
    public async Task<IActionResult> ResendConfirmationEmail(int id)
    {
        var enrollment = await _context.CourseEnrollments
            .Include(e => e.User)
            .Include(e => e.Course)
                .ThenInclude(c => c.Organization)
            .Include(e => e.Course)
                .ThenInclude(c => c.Location)
            .FirstOrDefaultAsync(ce => ce.Id == id && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        // Check if enrollment is approved
        if (!enrollment.FinalApproval || enrollment.Status != EnrollmentStatus.Approve)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Confirmation email can only be sent for approved enrollments."
            });
        }

        try
        {
            var emailSent = await _emailService.SendCourseApprovalConfirmationAsync(
                enrollment.User.Email,
                enrollment.User.FullName,
                enrollment.Course.CourseTitle,
                enrollment.Course.Description,
                enrollment.Course.StartDateTime,
                enrollment.Course.EndDateTime,
                enrollment.Course.Location?.Name,
                enrollment.Course.Organization?.Name ?? "Ministry of Oil"
            );

            if (emailSent)
            {
                enrollment.ConfirmationEmailSent = true;
                enrollment.UpdatedAt = DateTime.Now;
                enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
                await _context.SaveChangesAsync();

                return Ok(new BaseResponse<bool>
                {
                    StatusCode = 200,
                    Message = "Confirmation email sent successfully.",
                    Result = true
                });
            }
            else
            {
                return StatusCode(500, new BaseResponse<bool>
                {
                    StatusCode = 500,
                    Message = "Failed to send confirmation email.",
                    Result = false
                });
            }
        }
        catch (Exception ex)
        {
            return StatusCode(500, new BaseResponse<bool>
            {
                StatusCode = 500,
                Message = $"Error sending confirmation email: {ex.Message}",
                Result = false
            });
        }
    }

    [HttpPatch("{id}/approve")]
    public async Task<IActionResult> ApproveEnrollment(int id)
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
            .Include(e => e.ApprovalSteps)
            .FirstOrDefaultAsync(ce => ce.Id == id && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        // Check if enrollment is already finalized
        if (enrollment.FinalApproval)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Enrollment is already finalized."
            });
        }

        // Check if this enrollment has approval steps - if so, use step-by-step approval instead
        if (enrollment.ApprovalSteps != null && enrollment.ApprovalSteps.Any(a => !a.IsDeleted))
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "This enrollment requires step-by-step approval. Use the approve-step endpoint instead."
            });
        }

        // Simple approval for enrollments without approval steps
        enrollment.FinalApproval = true;
        enrollment.Status = EnrollmentStatus.Approve;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = currentUserId;

        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(enrollment)
            .Reference(e => e.User)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.Organization)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.Department)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.JobTitle)
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
                UserName = enrollment.User.UserName,
                OrganizationId = enrollment.User.OrganizationId,
                OrganizationName = enrollment.User.Organization?.Name,
                OrganizationIsMain = enrollment.User.Organization?.IsMain,
                DepartmentId = enrollment.User.DepartmentId,
                DepartmentName = enrollment.User.Department != null ? (enrollment.User.Department.NameEn ?? enrollment.User.Department.NameAr) : null,
                JobTitle = enrollment.User.JobTitle != null ? (enrollment.User.JobTitle.NameEn ?? enrollment.User.JobTitle.NameAr) : null
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
            .Include(e => e.ApprovalSteps)
            .FirstOrDefaultAsync(ce => ce.Id == id && !ce.IsDeleted);

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found."
            });
        }

        // Check if enrollment is already finalized
        if (enrollment.FinalApproval)
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Enrollment is already finalized."
            });
        }

        // Check if this enrollment has approval steps - if so, use step-by-step rejection instead
        if (enrollment.ApprovalSteps != null && enrollment.ApprovalSteps.Any(a => !a.IsDeleted))
        {
            return BadRequest(new BaseResponse<CourseEnrollmentDto>
            {
                StatusCode = 400,
                Message = "This enrollment requires step-by-step approval. Use the reject-step endpoint instead."
            });
        }

        // Simple rejection for enrollments without approval steps
        enrollment.FinalApproval = true;
        enrollment.Status = EnrollmentStatus.Reject;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = currentUserId;

        await _context.SaveChangesAsync();

        // Load related data for response
        await _context.Entry(enrollment)
            .Reference(e => e.User)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.Organization)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.Department)
            .LoadAsync();
        await _context.Entry(enrollment.User)
            .Reference(u => u.JobTitle)
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
                UserName = enrollment.User.UserName,
                OrganizationId = enrollment.User.OrganizationId,
                OrganizationName = enrollment.User.Organization?.Name,
                OrganizationIsMain = enrollment.User.Organization?.IsMain,
                DepartmentId = enrollment.User.DepartmentId,
                DepartmentName = enrollment.User.Department != null ? (enrollment.User.Department.NameEn ?? enrollment.User.Department.NameAr) : null,
                JobTitle = enrollment.User.JobTitle != null ? (enrollment.User.JobTitle.NameEn ?? enrollment.User.JobTitle.NameAr) : null
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

    [HttpGet("export")]
    [Authorize]
    public async Task<IActionResult> ExportToExcel(
        [FromQuery] int courseId,
        [FromQuery] EnrollmentStatus? status = null,
        [FromQuery] int? organizationId = null)
    {
        try
        {
            // Get organization filter
            var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();

            // Build base query
            var query = _context.CourseEnrollments
                .Include(ce => ce.Course)
                .Include(ce => ce.User)
                    .ThenInclude(u => u.Organization)
                .Include(ce => ce.User)
                    .ThenInclude(u => u.Department)
                .Include(ce => ce.User)
                    .ThenInclude(u => u.JobTitle)
                .Where(ce => ce.CourseId == courseId && !ce.IsDeleted);

            // Apply organization filter for course
            if (orgFilter.HasValue)
            {
                query = query.Where(ce => ce.Course.OrganizationId == orgFilter.Value);
            }

            // Apply status filter
            if (status.HasValue)
            {
                var statusValue = status.Value;
                query = query.Where(ce => ce.Status == statusValue);
            }

            // Apply user organization filter
            if (organizationId.HasValue)
            {
                var orgIdValue = organizationId.Value;
                query = query.Where(ce => ce.User.OrganizationId == orgIdValue);
            }

            // Get all enrollments matching the criteria
            var enrollments = await query
                .OrderByDescending(ce => ce.EnrollmentAt)
                .ToListAsync();

            // Build CSV content
            var csvRows = new List<string>();
            
            // Add headers
            var headers = new[]
            {
                "Organization",
                "Name",
                "Email",
                "Department",
                "Job Title",
                "Enrollment Date",
                "Status",
                "Final Approval"
            };
            csvRows.Add(string.Join(",", headers.Select(h => $"\"{h}\"")));

            // Add data rows
            foreach (var enrollment in enrollments)
            {
                var statusText = enrollment.Status switch
                {
                    EnrollmentStatus.Pending => "Pending",
                    EnrollmentStatus.Approve => "Approved",
                    EnrollmentStatus.Reject => "Rejected",
                    EnrollmentStatus.Excuse => "Excused",
                    _ => "Unknown"
                };

                var row = new[]
                {
                    enrollment.User?.Organization?.Name ?? "No Organization",
                    enrollment.User?.FullName ?? "",
                    enrollment.User?.Email ?? "",
                    enrollment.User?.Department != null 
                        ? (enrollment.User.Department.NameEn ?? enrollment.User.Department.NameAr) 
                        : "",
                    enrollment.User?.JobTitle != null 
                        ? (enrollment.User.JobTitle.NameEn ?? enrollment.User.JobTitle.NameAr) 
                        : "",
                    enrollment.EnrollmentAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    statusText,
                    enrollment.FinalApproval ? "Yes" : "No"
                };

                csvRows.Add(string.Join(",", row.Select(cell =>
                {
                    var cellStr = cell ?? "";
                    if (cellStr.Contains(",") || cellStr.Contains("\n") || cellStr.Contains("\""))
                    {
                        return $"\"{cellStr.Replace("\"", "\"\"")}\"";
                    }
                    return $"\"{cellStr}\"";
                })));
            }

            // Convert to bytes with UTF-8 BOM
            var csvContent = string.Join("\n", csvRows);
            var bom = Encoding.UTF8.GetPreamble();
            var csvBytes = Encoding.UTF8.GetBytes(csvContent);
            var result = new byte[bom.Length + csvBytes.Length];
            Buffer.BlockCopy(bom, 0, result, 0, bom.Length);
            Buffer.BlockCopy(csvBytes, 0, result, bom.Length, csvBytes.Length);

            // Determine filename
            var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId);
            var courseName = course?.CourseTitle ?? "Course";
            var statusSuffix = status.HasValue
                ? (status.Value == EnrollmentStatus.Approve ? "Approved" : status.Value == EnrollmentStatus.Reject ? "Rejected" : status.Value.ToString())
                : "All";
            var orgSuffix = organizationId.HasValue
                ? $"_{enrollments.FirstOrDefault()?.User?.Organization?.Name?.Replace(" ", "_") ?? "Organization"}"
                : "";
            var dateStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var filename = $"Course_Enrollments_{statusSuffix}{orgSuffix}_{courseName.Replace(" ", "_")}_{dateStr}.csv";

            return File(result, "text/csv; charset=utf-8", filename);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new BaseResponse<bool>
            {
                StatusCode = 500,
                Message = $"Error exporting enrollments: {ex.Message}",
                Result = false
            });
        }
    }

    [HttpPost("sync-approval-steps/{courseId}")]
    public async Task<IActionResult> SyncApprovalSteps(int courseId)
    {
        try
        {
            // Get the course to find its CourseTabId
            var course = await _context.Courses
                .FirstOrDefaultAsync(c => c.Id == courseId && !c.IsDeleted);
            
            if (course == null)
            {
                return NotFound(new BaseResponse<bool>
                {
                    StatusCode = 404,
                    Message = "Course not found.",
                    Result = false
                });
            }

            // Get all active CourseTabApprovals for this course's tab
            var activeApprovals = await _context.CourseTabApprovals
                .Where(cta => cta.CourseTabId == course.CourseTabId && !cta.IsDeleted && cta.IsActive)
                .OrderBy(cta => cta.ApprovalOrder)
                .ToListAsync();

            // Get all pending enrollments for this course
            var enrollments = await _context.CourseEnrollments
                .Include(e => e.ApprovalSteps)
                .Where(e => e.CourseId == courseId && !e.IsDeleted && !e.FinalApproval)
                .ToListAsync();

            var currentUser = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            var syncedCount = 0;

            foreach (var enrollment in enrollments)
            {
                // Get existing approval step IDs
                var existingApprovalIds = enrollment.ApprovalSteps
                    .Where(a => !a.IsDeleted)
                    .Select(a => a.CourseTabApprovalId)
                    .ToHashSet();

                // Add missing approval steps
                foreach (var approval in activeApprovals)
                {
                    if (!existingApprovalIds.Contains(approval.Id))
                    {
                        var newStep = new CourseEnrollmentApproval
                        {
                            CourseEnrollmentId = enrollment.Id,
                            CourseTabApprovalId = approval.Id,
                            IsApproved = false,
                            IsRejected = false,
                            CreatedBy = currentUser,
                            CreatedOn = DateTime.Now
                        };
                        _context.CourseEnrollmentApprovals.Add(newStep);
                        syncedCount++;
                    }
                }

                // Soft-delete approval steps that are no longer active
                var activeApprovalIds = activeApprovals.Select(a => a.Id).ToHashSet();
                foreach (var step in enrollment.ApprovalSteps.Where(a => !a.IsDeleted))
                {
                    if (!activeApprovalIds.Contains(step.CourseTabApprovalId))
                    {
                        step.IsDeleted = true;
                        step.UpdatedAt = DateTime.Now;
                        step.UpdatedBy = currentUser;
                        syncedCount++;
                    }
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new BaseResponse<object>
            {
                StatusCode = 200,
                Message = $"Successfully synced approval steps for {enrollments.Count} enrollments. {syncedCount} changes made.",
                Result = new { enrollmentsProcessed = enrollments.Count, changesMade = syncedCount }
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new BaseResponse<bool>
            {
                StatusCode = 500,
                Message = $"Error syncing approval steps: {ex.Message}",
                Result = false
            });
        }
    }
}

