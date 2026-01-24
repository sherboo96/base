using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public enum CourseLanguage
{
    Arabic = 1,
    English = 2
}

public enum TargetUserType
{
    ForOurOrganization = 1,
    All = 2,
    SpecificDepartments = 3,
    SpecificOrganizations = 4,
    SpecificSegments = 5,
    AllUsersOfOrganization = 6, // For non-main organizations
    SpecificOrganizationSegment = 7 // For non-main organizations
}

public class Course : BaseModel
{
    public int Id { get; set; }
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
    public Location? Location { get; set; }
    public DateTime? StartDateTime { get; set; }
    public DateTime? EndDateTime { get; set; }
    public int AvailableSeats { get; set; }
    public int AvailableOnlineSeats { get; set; } = 0;
    public decimal Price { get; set; } = 0;
    public decimal KpiWeight { get; set; } = 0;
    public bool DigitLibraryAvailability { get; set; } = false;
    public bool CertificateAvailable { get; set; } = false;
    public int CourseTabId { get; set; }
    public CourseTab CourseTab { get; set; }
    public int OrganizationId { get; set; }
    public Organization Organization { get; set; }
    
    // Target User Configuration
    public TargetUserType? TargetUserType { get; set; }
    public string? TargetDepartmentIds { get; set; } // JSON array of department IDs, e.g., "[1,2,3]"
    public string? TargetDepartmentRole { get; set; } // "Head", "Member", or "Both" - DEPRECATED: Use TargetDepartmentRoles instead
    public string? TargetDepartmentRoles { get; set; } // JSON object mapping department IDs to roles, e.g., "{\"1\":\"Head\",\"2\":\"Member\",\"3\":\"Both\"}"
    public string? TargetOrganizationIds { get; set; } // JSON array of organization IDs, e.g., "[1,2,3]"
    public string? TargetSegmentIds { get; set; } // JSON array of segment IDs, e.g., "[1,2,3]"
    public string? Questions { get; set; } // JSON array of course enrollment questions

    // Teams Meeting Integration
    public string? TeamsEventId { get; set; } // Microsoft Graph Event ID
    public string? TeamsJoinUrl { get; set; } // Teams meeting join URL
    public DateTime? TeamsMeetingCreatedAt { get; set; } // When the Teams meeting was created

    [JsonIgnore]
    public ICollection<CourseLearningOutcome> LearningOutcomes { get; set; } = new List<CourseLearningOutcome>();

    [JsonIgnore]
    public ICollection<CourseContent> CourseContents { get; set; } = new List<CourseContent>();

    [JsonIgnore]
    public ICollection<CourseInstructor> CourseInstructors { get; set; } = new List<CourseInstructor>();

    [JsonIgnore]
    public ICollection<CourseAdoptionUser> CourseAdoptionUsers { get; set; } = new List<CourseAdoptionUser>();

    [JsonIgnore]
    public ICollection<CourseContact> CourseContacts { get; set; } = new List<CourseContact>();

    [JsonIgnore]
    public ICollection<CourseQuestion> CourseQuestions { get; set; } = new List<CourseQuestion>();
}
