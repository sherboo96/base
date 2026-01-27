using UMS.Models;

namespace UMS.Dtos;

public class CourseDto
{
    public int? Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public string Code { get; set; }
    public string CourseTitle { get; set; }
    public string? CourseTitleAr { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAr { get; set; }
    public CourseLanguage Language { get; set; } = CourseLanguage.English;
    public CourseStatus Status { get; set; } = CourseStatus.Draft;
    public LocationCategory Category { get; set; } = LocationCategory.Onsite;
    public int? LocationId { get; set; }
    public LocationDto? Location { get; set; }
    public DateTime? StartDateTime { get; set; }
    public DateTime? EndDateTime { get; set; }
    public int AvailableSeats { get; set; }
    public int AvailableOnlineSeats { get; set; } = 0;
    public decimal Price { get; set; } = 0;
    public decimal KpiWeight { get; set; } = 0;
    public bool DigitLibraryAvailability { get; set; } = false;
    public bool CertificateAvailable { get; set; } = false;
    public int CourseTabId { get; set; }
    public CourseTabDto? CourseTab { get; set; }
    public int OrganizationId { get; set; }
    public OrganizationDto? Organization { get; set; }
    public List<CourseLearningOutcomeDto> LearningOutcomes { get; set; } = new();
    public List<CourseContentDto> CourseContents { get; set; } = new();
    public List<int> InstructorIds { get; set; } = new();
    public List<InstructorDto> Instructors { get; set; } = new();
    public List<CourseAdoptionUserDto> AdoptionUsers { get; set; } = new();
    public List<CourseContactDto> CourseContacts { get; set; } = new();
    public bool IsActive { get; set; } = true;
    public string? Questions { get; set; } // JSON array of course enrollment questions
    
    // Target User Configuration
    public TargetUserType? TargetUserType { get; set; }
    public List<int>? TargetDepartmentIds { get; set; }
    public string? TargetDepartmentRole { get; set; } // "Head", "Member", or "Both" - DEPRECATED: Use TargetDepartmentRoles instead
    public Dictionary<int, string>? TargetDepartmentRoles { get; set; } // Dictionary mapping department IDs to roles, e.g., {1: "Head", 2: "Member", 3: "Both"}
    public List<int>? TargetOrganizationIds { get; set; }
    public List<int>? TargetSegmentIds { get; set; }
    
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    
    // Enrollment information for current user
    public bool IsEnrolled { get; set; } = false;
    public string? EnrollmentStatus { get; set; } // "Pending", "Approved", "Rejected", etc.
    public int? EnrollmentId { get; set; }
    
    // Enrollment counts
    public int OnlineEnrollmentsCount { get; set; } = 0; // Number of approved online enrollments
    public int OnsiteEnrollmentsCount { get; set; } = 0; // Number of approved onsite enrollments
    
    // Teams Meeting Integration
    public string? TeamsEventId { get; set; } // Microsoft Graph Event ID
    public string? TeamsJoinUrl { get; set; } // Teams meeting join URL
    public DateTime? TeamsMeetingCreatedAt { get; set; } // When the Teams meeting was created
}

/// <summary>
/// Lightweight DTO for active courses in the mobile attendance (check-in/check-out) view.
/// Only includes fields needed for listing and time-window validation.
/// </summary>
public class CourseForAttendanceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameAr { get; set; }
    public string Code { get; set; } = string.Empty;
    public string CourseTitle { get; set; } = string.Empty;
    public string? CourseTitleAr { get; set; }
    public DateTime? StartDateTime { get; set; }
    public DateTime? EndDateTime { get; set; }
    public int? LocationId { get; set; }
    public string? LocationName { get; set; }
    public string? LocationNameAr { get; set; }
}

public class CourseLearningOutcomeDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public int CourseId { get; set; }
}

public class CourseContentDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public int CourseId { get; set; }
}
