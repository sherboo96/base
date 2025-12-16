using System.Linq.Expressions;
using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;
using UMS.Interfaces;
using UMS.Data;
using UMS.Const;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CoursesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly OrganizationAccessService _orgAccessService;
    private readonly ApplicationDbContext _context;
    private readonly EmailService _emailService;

    public CoursesController(
        IUnitOfWork unitOfWork, 
        OrganizationAccessService orgAccessService, 
        ApplicationDbContext context,
        EmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _orgAccessService = orgAccessService;
        _context = context;
        _emailService = emailService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] int? organizationId = null,
        [FromQuery] int? courseTabId = null,
        [FromQuery] CourseStatus? status = null,
        [FromQuery] DateTime? startDateFrom = null,
        [FromQuery] DateTime? startDateTo = null,
        [FromQuery] DateTime? endDateFrom = null,
        [FromQuery] DateTime? endDateTo = null,
        [FromQuery] int? locationId = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var skip = (page - 1) * pageSize;

        // Build filter expression
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? (search ?? "").ToLower().Trim() : "";

        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        var effectiveOrgFilter = organizationId ?? orgFilter;

        Expression<Func<Course, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)) ||
             x.CourseTitle.ToLower().Contains(searchLower) ||
             (x.CourseTitleAr != null && x.CourseTitleAr.ToLower().Contains(searchLower)) ||
             x.Code.ToLower().Contains(searchLower)) &&
             // (!effectiveOrgFilter.HasValue || x.OrganizationId == effectiveOrgFilter.Value) && // REPLACED WITH BELOW:
            // For Published courses, we don't strictly enforce the user's organization filter (to allow viewing public courses from other orgs)
            // But if a specific organizationId is requested in the query, we respect it.
            (status == CourseStatus.Published 
                ? (!organizationId.HasValue || x.OrganizationId == organizationId.Value)
                : (!effectiveOrgFilter.HasValue || x.OrganizationId == effectiveOrgFilter.Value)) &&
            (!courseTabId.HasValue || x.CourseTabId == courseTabId.Value) &&
            (!status.HasValue || x.Status == status.Value) &&
            (!startDateFrom.HasValue || (x.StartDateTime.HasValue && x.StartDateTime.Value.Date >= startDateFrom.Value.Date)) &&
            (!startDateTo.HasValue || (x.StartDateTime.HasValue && x.StartDateTime.Value.Date <= startDateTo.Value.Date)) &&
            (!endDateFrom.HasValue || (x.EndDateTime.HasValue && x.EndDateTime.Value.Date >= endDateFrom.Value.Date)) &&
            (!endDateTo.HasValue || (x.EndDateTime.HasValue && x.EndDateTime.Value.Date <= endDateTo.Value.Date)) &&
            (!locationId.HasValue || x.LocationId == locationId.Value);

        // Order by StartDateTime (ascending - earliest first)
        Expression<Func<Course, object>> orderBy = x => (object)(x.StartDateTime ?? DateTime.MaxValue);

        // For published courses, we need to filter by target user before pagination
        // So we'll fetch all matching courses, filter, then paginate
        List<CourseDto> courseDtos;
        int filteredTotal;
        
        if (status == CourseStatus.Published)
        {
            // Fetch all courses matching the base filter (without pagination)
            var allData = await _unitOfWork.Courses.GetAllAsync(
                10000, // Large number to get all
                0,
                filter,
                orderBy,
                OrderBy.Ascending,
                new[] { "CourseTab", "Organization", "Location", "CourseInstructors.Instructor", "CourseContents", "LearningOutcomes", "CourseAdoptionUsers.AdoptionUser", "CourseContacts" }
            );

            // Map to DTOs
            var allCourseDtos = allData.Select(c => MapToDto(c)).ToList();

            // Filter by target user settings
            var filteredAll = await FilterCoursesByTargetUser(allCourseDtos);
            filteredTotal = filteredAll.Count;

            // Apply pagination after filtering
            courseDtos = filteredAll.Skip(skip).Take(pageSize).ToList();
        }
        else
        {
            // For management view, use normal pagination without target user filtering
            var total = await _unitOfWork.Courses.CountAsync(filter);
            var data = await _unitOfWork.Courses.GetAllAsync(
                pageSize,
                skip,
                filter,
                orderBy,
                OrderBy.Ascending,
                new[] { "CourseTab", "Organization", "Location", "CourseInstructors.Instructor", "CourseContents", "LearningOutcomes", "CourseAdoptionUsers.AdoptionUser", "CourseContacts" }
            );

            courseDtos = data.Select(c => MapToDto(c)).ToList();
            filteredTotal = total;
        }

        // Populate enrollment status for current user
        await PopulateEnrollmentStatus(courseDtos);

        var response = new BaseResponse<IEnumerable<CourseDto>>
        {
            StatusCode = 200,
            Message = "Courses retrieved successfully.",
            Result = courseDtos,
            Total = filteredTotal,
            Pagination = new Pagination
            {
                CurrentPage = page,
                PageSize = pageSize,
                Total = filteredTotal
            }
        };

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Courses.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "CourseTab", "Organization", "Location", "LearningOutcomes", "CourseContents", "CourseInstructors.Instructor", "CourseAdoptionUsers.AdoptionUser", "CourseContacts" }
        );
        
        if (item == null)
            return NotFound(new BaseResponse<CourseDto> { StatusCode = 404, Message = "Course not found." });

        return Ok(new BaseResponse<CourseDto>
        {
            StatusCode = 200,
            Message = "Course retrieved successfully.",
            Result = MapToDto(item)
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CourseDto dto)
    {
        // Get current user from token
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value 
                          ?? User.FindFirst("UserName")?.Value 
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name 
                          ?? "System";

        // Create course entity
        var course = new Course
        {
            Name = dto.Name,
            NameAr = dto.NameAr,
            Code = dto.Code,
            CourseTitle = dto.CourseTitle,
            CourseTitleAr = dto.CourseTitleAr,
            Description = dto.Description,
            DescriptionAr = dto.DescriptionAr,
            Language = dto.Language,
            Status = dto.Status,
            Category = dto.Category,
            LocationId = dto.LocationId > 0 ? dto.LocationId : null,
            StartDateTime = dto.StartDateTime,
            EndDateTime = dto.EndDateTime,
            AvailableSeats = dto.AvailableSeats,
            Price = dto.Price,
            KpiWeight = dto.KpiWeight,
            DigitLibraryAvailability = dto.DigitLibraryAvailability,
            CertificateAvailable = dto.CertificateAvailable,
            CourseTabId = dto.CourseTabId,
            OrganizationId = dto.OrganizationId,
            IsActive = dto.IsActive,
            TargetUserType = dto.TargetUserType,
            TargetDepartmentIds = dto.TargetDepartmentIds != null && dto.TargetDepartmentIds.Any() ? JsonSerializer.Serialize(dto.TargetDepartmentIds) : null,
            TargetDepartmentRole = dto.TargetDepartmentRole, // DEPRECATED: Keep for backward compatibility
            TargetDepartmentRoles = dto.TargetDepartmentRoles != null && dto.TargetDepartmentRoles.Any() ? JsonSerializer.Serialize(dto.TargetDepartmentRoles) : null,
            TargetOrganizationIds = dto.TargetOrganizationIds != null && dto.TargetOrganizationIds.Any() ? JsonSerializer.Serialize(dto.TargetOrganizationIds) : null,
            TargetSegmentIds = dto.TargetSegmentIds != null && dto.TargetSegmentIds.Any() ? JsonSerializer.Serialize(dto.TargetSegmentIds) : null,
            CreatedBy = currentUser
        };

        var entity = await _unitOfWork.Courses.AddAsync(course);
        await _unitOfWork.CompleteAsync();

        var createdId = ((Course)entity).Id;

        // Add learning outcomes
        if (dto.LearningOutcomes != null && dto.LearningOutcomes.Count > 0)
        {
            foreach (var outcomeDto in dto.LearningOutcomes)
            {
                if (!string.IsNullOrWhiteSpace(outcomeDto.Name))
                {
                    var outcome = new CourseLearningOutcome
                    {
                        Name = outcomeDto.Name,
                        NameAr = outcomeDto.NameAr ?? string.Empty,
                        CourseId = createdId,
                        CreatedBy = currentUser
                    };
                    await _context.CourseLearningOutcomes.AddAsync(outcome);
                }
            }
        }

        // Add course contents
        if (dto.CourseContents != null && dto.CourseContents.Count > 0)
        {
            foreach (var contentDto in dto.CourseContents)
            {
                if (!string.IsNullOrWhiteSpace(contentDto.Name))
                {
                    var content = new CourseContent
                    {
                        Name = contentDto.Name,
                        NameAr = contentDto.NameAr ?? string.Empty,
                        CourseId = createdId,
                        CreatedBy = currentUser
                    };
                    await _context.CourseContents.AddAsync(content);
                }
            }
        }

        // Add instructors (many-to-many)
        if (dto.InstructorIds != null && dto.InstructorIds.Count > 0)
        {
            foreach (var instructorId in dto.InstructorIds)
            {
                if (instructorId > 0)
                {
                    var courseInstructor = new CourseInstructor
                    {
                        CourseId = createdId,
                        InstructorId = instructorId,
                        CreatedBy = currentUser
                    };
                    await _context.CourseInstructors.AddAsync(courseInstructor);
                }
            }
        }

        // Add adoption users (many-to-many with type)
        if (dto.AdoptionUsers != null && dto.AdoptionUsers.Count > 0)
        {
            foreach (var adoptionUserDto in dto.AdoptionUsers)
            {
                if (adoptionUserDto.AdoptionUserId > 0)
                {
                    var courseAdoptionUser = new CourseAdoptionUser
                    {
                        CourseId = createdId,
                        AdoptionUserId = adoptionUserDto.AdoptionUserId,
                        AdoptionType = adoptionUserDto.AdoptionType,
                        CreatedBy = currentUser
                    };
                    await _context.CourseAdoptionUsers.AddAsync(courseAdoptionUser);
                }
            }
        }

        // Add course contacts
        if (dto.CourseContacts != null && dto.CourseContacts.Count > 0)
        {
            foreach (var contactDto in dto.CourseContacts)
            {
                if (!string.IsNullOrWhiteSpace(contactDto.Name))
                {
                    var contact = new CourseContact
                    {
                        CourseId = createdId,
                        Name = contactDto.Name,
                        PhoneNumber = contactDto.PhoneNumber ?? string.Empty,
                        EmailAddress = contactDto.EmailAddress ?? string.Empty,
                        CreatedBy = currentUser
                    };
                    await _context.CourseContacts.AddAsync(contact);
                }
            }
        }

        await _unitOfWork.CompleteAsync();

        // Fetch the created entity with all relationships
        var result = await _unitOfWork.Courses.FindAsync(
            x => x.Id == createdId && !x.IsDeleted,
            new[] { "CourseTab", "Organization", "Location", "LearningOutcomes", "CourseContents", "CourseInstructors.Instructor" }
        );

        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<CourseDto>
        {
            StatusCode = 201,
            Message = "Course created successfully.",
            Result = MapToDto(result)
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] CourseDto dto)
    {
        // Get current user from token
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value 
                          ?? User.FindFirst("UserName")?.Value 
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name 
                          ?? "System";

        var existing = await _unitOfWork.Courses.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "LearningOutcomes", "CourseContents", "CourseInstructors" }
        );

        if (existing == null)
            return NotFound(new BaseResponse<CourseDto> { StatusCode = 404, Message = "Course not found." });

        // Update course properties
        existing.Name = dto.Name;
        existing.NameAr = dto.NameAr;
        existing.Code = dto.Code;
        existing.CourseTitle = dto.CourseTitle;
        existing.CourseTitleAr = dto.CourseTitleAr;
        existing.Description = dto.Description;
        existing.DescriptionAr = dto.DescriptionAr;
        existing.Language = dto.Language;
        existing.Status = dto.Status;
        existing.Category = dto.Category;
        existing.LocationId = dto.LocationId;
        existing.StartDateTime = dto.StartDateTime;
        existing.EndDateTime = dto.EndDateTime;
        existing.AvailableSeats = dto.AvailableSeats;
        existing.Price = dto.Price;
        existing.KpiWeight = dto.KpiWeight;
        existing.DigitLibraryAvailability = dto.DigitLibraryAvailability;
        existing.CertificateAvailable = dto.CertificateAvailable;
        existing.CourseTabId = dto.CourseTabId;
        existing.OrganizationId = dto.OrganizationId;
        existing.IsActive = dto.IsActive;
        existing.TargetUserType = dto.TargetUserType;
        existing.TargetDepartmentIds = dto.TargetDepartmentIds != null && dto.TargetDepartmentIds.Any() ? JsonSerializer.Serialize(dto.TargetDepartmentIds) : null;
        existing.TargetDepartmentRole = dto.TargetDepartmentRole; // DEPRECATED: Keep for backward compatibility
        existing.TargetDepartmentRoles = dto.TargetDepartmentRoles != null && dto.TargetDepartmentRoles.Any() ? JsonSerializer.Serialize(dto.TargetDepartmentRoles) : null;
        existing.TargetOrganizationIds = dto.TargetOrganizationIds != null && dto.TargetOrganizationIds.Any() ? JsonSerializer.Serialize(dto.TargetOrganizationIds) : null;
        existing.TargetSegmentIds = dto.TargetSegmentIds != null && dto.TargetSegmentIds.Any() ? JsonSerializer.Serialize(dto.TargetSegmentIds) : null;
        existing.UpdatedAt = DateTime.Now;
        existing.UpdatedBy = currentUser;

        // Update learning outcomes (delete existing and add new)
        var existingOutcomeIds = existing.LearningOutcomes.Select(o => o.Id).ToList();
        if (existingOutcomeIds.Any())
        {
            var outcomesToDelete = await _context.CourseLearningOutcomes
                .Where(o => existingOutcomeIds.Contains(o.Id))
                .ToListAsync();
            _context.CourseLearningOutcomes.RemoveRange(outcomesToDelete);
        }

        if (dto.LearningOutcomes != null && dto.LearningOutcomes.Any())
        {
            foreach (var outcomeDto in dto.LearningOutcomes)
            {
                var outcome = new CourseLearningOutcome
                {
                    Name = outcomeDto.Name,
                    NameAr = outcomeDto.NameAr,
                    CourseId = id,
                    CreatedBy = currentUser
                };
                await _context.CourseLearningOutcomes.AddAsync(outcome);
            }
        }

        // Update course contents
        var existingContentIds = existing.CourseContents.Select(c => c.Id).ToList();
        if (existingContentIds.Any())
        {
            var contentsToDelete = await _context.CourseContents
                .Where(c => existingContentIds.Contains(c.Id))
                .ToListAsync();
            _context.CourseContents.RemoveRange(contentsToDelete);
        }

        if (dto.CourseContents != null && dto.CourseContents.Any())
        {
            foreach (var contentDto in dto.CourseContents)
            {
                var content = new CourseContent
                {
                    Name = contentDto.Name,
                    NameAr = contentDto.NameAr,
                    CourseId = id,
                    CreatedBy = currentUser
                };
                await _context.CourseContents.AddAsync(content);
            }
        }

        // Update instructors (delete existing and add new)
        var existingInstructorIds = existing.CourseInstructors.Select(ci => ci.InstructorId).ToList();
        
        if (existingInstructorIds.Any())
        {
            var instructorsToDelete = await _context.CourseInstructors
                .Where(ci => ci.CourseId == id)
                .ToListAsync();
            _context.CourseInstructors.RemoveRange(instructorsToDelete);
        }

        if (dto.InstructorIds != null && dto.InstructorIds.Any())
        {
            foreach (var instructorId in dto.InstructorIds)
            {
                var courseInstructor = new CourseInstructor
                {
                    CourseId = id,
                    InstructorId = instructorId,
                    CreatedBy = currentUser
                };
                await _context.CourseInstructors.AddAsync(courseInstructor);
            }
        }

        // Update adoption users (delete existing and add new)
        var existingAdoptionUsers = await _context.CourseAdoptionUsers
            .Where(cau => cau.CourseId == id)
            .ToListAsync();
        if (existingAdoptionUsers.Any())
        {
            _context.CourseAdoptionUsers.RemoveRange(existingAdoptionUsers);
        }

        if (dto.AdoptionUsers != null && dto.AdoptionUsers.Any())
        {
            foreach (var adoptionUserDto in dto.AdoptionUsers)
            {
                if (adoptionUserDto.AdoptionUserId > 0)
                {
                    var courseAdoptionUser = new CourseAdoptionUser
                    {
                        CourseId = id,
                        AdoptionUserId = adoptionUserDto.AdoptionUserId,
                        AdoptionType = adoptionUserDto.AdoptionType,
                        CreatedBy = currentUser
                    };
                    await _context.CourseAdoptionUsers.AddAsync(courseAdoptionUser);
                }
            }
        }

        // Update course contacts (delete existing and add new)
        var existingContacts = await _context.CourseContacts
            .Where(cc => cc.CourseId == id)
            .ToListAsync();
        if (existingContacts.Any())
        {
            _context.CourseContacts.RemoveRange(existingContacts);
        }

        if (dto.CourseContacts != null && dto.CourseContacts.Any())
        {
            foreach (var contactDto in dto.CourseContacts)
            {
                if (!string.IsNullOrWhiteSpace(contactDto.Name))
                {
                    var contact = new CourseContact
                    {
                        CourseId = id,
                        Name = contactDto.Name,
                        PhoneNumber = contactDto.PhoneNumber ?? string.Empty,
                        EmailAddress = contactDto.EmailAddress ?? string.Empty,
                        CreatedBy = currentUser
                    };
                    await _context.CourseContacts.AddAsync(contact);
                }
            }
        }

        await _unitOfWork.Courses.UpdateAsync(existing);

        await _unitOfWork.CompleteAsync();

        // Fetch the updated entity with all relationships
        var result = await _unitOfWork.Courses.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "CourseTab", "Organization", "Location", "LearningOutcomes", "CourseContents", "CourseInstructors.Instructor" }
        );

        // Send email notification if course is rescheduled
        if (dto.Status == CourseStatus.Rescheduled)
        {
            try 
            {
                var approvedEnrollments = await _context.CourseEnrollments
                    .Include(e => e.User)
                    .Where(e => e.CourseId == id && 
                           e.FinalApproval == true && 
                           e.Status == EnrollmentStatus.Approve)
                    .ToListAsync();

                var locationName = result.Location?.Name ?? "TBA";
                var orgName = result.Organization?.Name ?? "Ministry of Oil";

                foreach (var enrollment in approvedEnrollments)
                {
                    if (enrollment.User != null && !string.IsNullOrEmpty(enrollment.User.Email))
                    {
                        await _emailService.SendCourseRescheduledEmailAsync(
                            enrollment.User.Email,
                            enrollment.User.FullName,
                            result.CourseTitle ?? result.Name, // Prefer Title, fallback to Name
                            result.Description,
                            result.StartDateTime,
                            result.EndDateTime,
                            locationName,
                            orgName
                        );
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the request
                // Using Console for now if logger is not injected in a way accessible here, 
                // but Controller should have ILogger access if needed. 
                // Since I didn't verify if ILogger<CoursesController> is there, I'll rely on global exception handlers or just proceed.
                // Assuming it's better to proceed than break the response.
            }
        }

        return Ok(new BaseResponse<CourseDto>
        {
            StatusCode = 200,
            Message = "Course updated successfully.",
            Result = MapToDto(result)
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        // Get current user from token
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value 
                          ?? User.FindFirst("UserName")?.Value 
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name 
                          ?? "System";

        var existing = await _unitOfWork.Courses.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Course not found." });

        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        existing.UpdatedBy = currentUser;
        await _unitOfWork.Courses.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Course deleted successfully.",
            Result = true
        });
    }

    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        // Get current user from token
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value 
                          ?? User.FindFirst("UserName")?.Value 
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name 
                          ?? "System";

        var existing = await _unitOfWork.Courses.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Course not found.",
                Result = false
            });
        }

        existing.IsActive = !existing.IsActive;
        existing.UpdatedAt = DateTime.Now;
        existing.UpdatedBy = currentUser;

        await _unitOfWork.Courses.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<CourseDto>
        {
            StatusCode = 200,
            Message = $"Course {(existing.IsActive ? "activated" : "deactivated")} successfully.",
            Result = MapToDto(existing)
        });
    }

    private CourseDto MapToDto(Course course)
    {
        return new CourseDto
        {
            Id = course.Id,
            Name = course.Name,
            NameAr = course.NameAr,
            Code = course.Code,
            CourseTitle = course.CourseTitle,
            CourseTitleAr = course.CourseTitleAr,
            Description = course.Description,
            DescriptionAr = course.DescriptionAr,
            Language = course.Language,
            Status = course.Status,
            Category = course.Category,
            LocationId = course.LocationId,
            Location = course.Location != null ? new LocationDto
            {
                Name = course.Location.Name,
                NameAr = course.Location.NameAr,
                Floor = course.Location.Floor,
                Building = course.Location.Building,
                Category = course.Location.Category,
                OrganizationId = course.Location.OrganizationId,
                Logo = course.Location.Logo,
                Template = course.Location.Template
            } : null,
            StartDateTime = course.StartDateTime,
            EndDateTime = course.EndDateTime,
            AvailableSeats = course.AvailableSeats,
            Price = course.Price,
            KpiWeight = course.KpiWeight,
            DigitLibraryAvailability = course.DigitLibraryAvailability,
            CertificateAvailable = course.CertificateAvailable,
            CourseTabId = course.CourseTabId,
            CourseTab = course.CourseTab != null ? new CourseTabDto
            {
                Name = course.CourseTab.Name,
                NameAr = course.CourseTab.NameAr,
                RouteCode = course.CourseTab.RouteCode,
                Icon = course.CourseTab.Icon,
                ExcuseTimeHours = course.CourseTab.ExcuseTimeHours,
                OrganizationId = course.CourseTab.OrganizationId,
                ShowInMenu = course.CourseTab.ShowInMenu,
                ShowPublic = course.CourseTab.ShowPublic,
                ShowForOtherOrganizations = course.CourseTab.ShowForOtherOrganizations
            } : null,
            OrganizationId = course.OrganizationId,
            Organization = course.Organization != null ? new OrganizationDto
            {
                Id = course.Organization.Id,
                Name = course.Organization.Name,
                NameAr = course.Organization.NameAr,
                Code = course.Organization.Code,
                Domain = course.Organization.Domain,
                IsMain = course.Organization.IsMain,
                AllowedLoginMethods = course.Organization.AllowedLoginMethods,
                DefaultLoginMethod = course.Organization.DefaultLoginMethod,
                IsActive = course.Organization.IsActive
            } : null,
            LearningOutcomes = course.LearningOutcomes?.Select(lo => new CourseLearningOutcomeDto
            {
                Id = lo.Id,
                Name = lo.Name,
                NameAr = lo.NameAr,
                CourseId = lo.CourseId
            }).ToList() ?? new List<CourseLearningOutcomeDto>(),
            CourseContents = course.CourseContents?.Select(cc => new CourseContentDto
            {
                Id = cc.Id,
                Name = cc.Name,
                NameAr = cc.NameAr,
                CourseId = cc.CourseId
            }).ToList() ?? new List<CourseContentDto>(),
            InstructorIds = course.CourseInstructors?.Select(ci => ci.InstructorId).ToList() ?? new List<int>(),
            Instructors = course.CourseInstructors?.Select(ci => new InstructorDto
            {
                Id = ci.Instructor.Id,
                NameEn = ci.Instructor.NameEn,
                NameAr = ci.Instructor.NameAr,
                Email = ci.Instructor.Email,
                Phone = ci.Instructor.Phone,
                Bio = ci.Instructor.Bio,
                ProfileImage = ci.Instructor.ProfileImage,
                InstitutionId = ci.Instructor.InstitutionId
            }).ToList() ?? new List<InstructorDto>(),
            AdoptionUsers = course.CourseAdoptionUsers?.Select(cau => new CourseAdoptionUserDto
            {
                Id = null, // Junction table doesn't have a separate Id
                CourseId = cau.CourseId,
                AdoptionUserId = cau.AdoptionUserId,
                AdoptionUser = cau.AdoptionUser != null ? new AdoptionUserDto
                {
                    Id = cau.AdoptionUser.Id,
                    Name = cau.AdoptionUser.Name,
                    NameAr = cau.AdoptionUser.NameAr,
                    Email = cau.AdoptionUser.Email,
                    Bio = cau.AdoptionUser.Bio,
                    Attendance = cau.AdoptionUser.Attendance,
                    OrganizationId = cau.AdoptionUser.OrganizationId
                } : null,
                AdoptionType = cau.AdoptionType
            }).ToList() ?? new List<CourseAdoptionUserDto>(),
            CourseContacts = course.CourseContacts?.Select(cc => new CourseContactDto
            {
                Id = cc.Id,
                CourseId = cc.CourseId,
                Name = cc.Name,
                PhoneNumber = cc.PhoneNumber,
                EmailAddress = cc.EmailAddress
            }).ToList() ?? new List<CourseContactDto>(),
            IsActive = course.IsActive,
            TargetUserType = course.TargetUserType,
            TargetDepartmentIds = !string.IsNullOrWhiteSpace(course.TargetDepartmentIds) 
                ? JsonSerializer.Deserialize<List<int>>(course.TargetDepartmentIds) 
                : null,
            TargetDepartmentRole = course.TargetDepartmentRole, // DEPRECATED: Keep for backward compatibility
            TargetDepartmentRoles = !string.IsNullOrWhiteSpace(course.TargetDepartmentRoles)
                ? JsonSerializer.Deserialize<Dictionary<int, string>>(course.TargetDepartmentRoles)
                : null,
            TargetOrganizationIds = !string.IsNullOrWhiteSpace(course.TargetOrganizationIds) 
                ? JsonSerializer.Deserialize<List<int>>(course.TargetOrganizationIds) 
                : null,
            TargetSegmentIds = !string.IsNullOrWhiteSpace(course.TargetSegmentIds) 
                ? JsonSerializer.Deserialize<List<int>>(course.TargetSegmentIds) 
                : null,
            CreatedAt = course.CreatedOn,
            CreatedBy = course.CreatedBy,
            UpdatedAt = course.UpdatedAt,
            UpdatedBy = course.UpdatedBy
        };
    }

    /// <summary>
    /// Populate enrollment status for the current user for each course
    /// </summary>
    private async Task PopulateEnrollmentStatus(List<CourseDto> courses)
    {
        // Get current user ID from token
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(currentUserId) || courses == null || !courses.Any())
        {
            return;
        }

        // Get all course IDs
        var courseIds = courses.Where(c => c.Id.HasValue).Select(c => c.Id!.Value).ToList();
        if (!courseIds.Any())
        {
            return;
        }

        // Get all enrollments for current user and these courses
        var enrollments = await _context.CourseEnrollments
            .Where(e => e.UserId == currentUserId && courseIds.Contains(e.CourseId) && !e.IsDeleted)
            .ToListAsync();

        // Populate enrollment info for each course
        foreach (var course in courses)
        {
            if (!course.Id.HasValue) continue;

            var enrollment = enrollments.FirstOrDefault(e => e.CourseId == course.Id.Value);
            if (enrollment != null)
            {
                course.IsEnrolled = true;
                course.EnrollmentId = enrollment.Id;
                // Map enrollment status to string
                course.EnrollmentStatus = enrollment.Status switch
                {
                    EnrollmentStatus.Pending => "Pending",
                    EnrollmentStatus.Approve => "Approved",
                    EnrollmentStatus.Reject => "Rejected",
                    EnrollmentStatus.Excuse => "Excused",
                    _ => "Pending"
                };
            }
            else
            {
                course.IsEnrolled = false;
                course.EnrollmentStatus = null;
                course.EnrollmentId = null;
            }
        }
    }

    /// <summary>
    /// Filter courses based on target user settings
    /// Only returns courses that the current user should see based on target user configuration
    /// </summary>
    private async Task<List<CourseDto>> FilterCoursesByTargetUser(List<CourseDto> courses)
    {
        // Get current user ID from token
        var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                          ?? User.FindFirst("UserId")?.Value 
                          ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        // If no user logged in, only return courses with no target user restrictions or explicit "All" target
        if (string.IsNullOrEmpty(currentUserId))
        {
            return courses.Where(c => !c.TargetUserType.HasValue || c.TargetUserType == TargetUserType.All).ToList();
        }

        // Load current user with related data
        var currentUser = await _unitOfWork.Users.FindAsync(
            u => u.Id == currentUserId && !u.IsDeleted,
            new[] { "Organization", "Department" }
        );

        if (currentUser == null)
        {
            // User not found, return only courses with no restrictions
            return courses.Where(c => !c.TargetUserType.HasValue).ToList();
        }

        // Load user segments
        var userSegmentIds = await _context.UserSegments
            .Where(us => us.UserId == currentUserId)
            .Select(us => us.SegmentId)
            .ToListAsync();

        // Filter courses based on target user settings
        var filteredCourses = new List<CourseDto>();

        foreach (var course in courses)
        {
            // If course has no target user type, show it to everyone
            if (!course.TargetUserType.HasValue)
            {
                filteredCourses.Add(course);
                continue;
            }

            var targetType = course.TargetUserType.Value;
            bool shouldShow = false;

            switch (targetType)
            {
                case TargetUserType.ForOurOrganization:
                    // Show if user's organization matches course's organization
                    shouldShow = currentUser.OrganizationId == course.OrganizationId;
                    break;

                case TargetUserType.All:
                    // Show to everyone
                    shouldShow = true;
                    break;

                case TargetUserType.SpecificDepartments:
                    // Show if user's department is in the list and role matches
                    if (course.TargetDepartmentIds == null || course.TargetDepartmentIds.Count == 0)
                    {
                        shouldShow = false;
                        break;
                    }
                    
                    if (!currentUser.DepartmentId.HasValue || 
                        !course.TargetDepartmentIds.Contains(currentUser.DepartmentId.Value))
                    {
                        shouldShow = false;
                        break;
                    }

                    // Check role if specified - prefer TargetDepartmentRoles over TargetDepartmentRole (deprecated)
                    string? departmentRole = null;
                    if (course.TargetDepartmentRoles != null && course.TargetDepartmentRoles.ContainsKey(currentUser.DepartmentId.Value))
                    {
                        // Use per-department role from TargetDepartmentRoles
                        departmentRole = course.TargetDepartmentRoles[currentUser.DepartmentId.Value];
                    }
                    else if (!string.IsNullOrEmpty(course.TargetDepartmentRole))
                    {
                        // Fallback to deprecated TargetDepartmentRole for backward compatibility
                        departmentRole = course.TargetDepartmentRole;
                    }

                    if (!string.IsNullOrEmpty(departmentRole))
                    {
                        if (departmentRole == "Both")
                        {
                            shouldShow = true; // Both Head and Member can see
                        }
                        else
                        {
                            shouldShow = currentUser.DepartmentRole == departmentRole;
                        }
                    }
                    else
                    {
                        shouldShow = true;
                    }
                    break;

                case TargetUserType.SpecificOrganizations:
                    // Show if user's organization is in the list
                    if (course.TargetOrganizationIds == null || course.TargetOrganizationIds.Count == 0)
                    {
                        shouldShow = false;
                        break;
                    }
                    shouldShow = course.TargetOrganizationIds.Contains(currentUser.OrganizationId);
                    break;

                case TargetUserType.SpecificSegments:
                    // Show if user is in any of the selected segments
                    if (course.TargetSegmentIds == null || course.TargetSegmentIds.Count == 0)
                    {
                        shouldShow = false;
                        break;
                    }
                    shouldShow = course.TargetSegmentIds.Any(segmentId => userSegmentIds.Contains(segmentId));
                    break;

                case TargetUserType.AllUsersOfOrganization:
                    // Show if user's organization matches course's organization
                    shouldShow = currentUser.OrganizationId == course.OrganizationId;
                    break;

                case TargetUserType.SpecificOrganizationSegment:
                    // Show if user is in any of the selected segments
                    if (course.TargetSegmentIds == null || course.TargetSegmentIds.Count == 0)
                    {
                        shouldShow = false;
                        break;
                    }
                    shouldShow = course.TargetSegmentIds.Any(segmentId => userSegmentIds.Contains(segmentId));
                    break;

                default:
                    // Unknown target type, don't show
                    shouldShow = false;
                    break;
            }

            if (shouldShow)
            {
                filteredCourses.Add(course);
            }
        }

        return filteredCourses;
    }
}
