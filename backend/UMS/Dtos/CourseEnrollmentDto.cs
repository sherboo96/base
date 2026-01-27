using System.Text.Json.Serialization;
using UMS.Models;

namespace UMS.Dtos;

public class CourseEnrollmentDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public CourseDto? Course { get; set; }
    public string UserId { get; set; }
    public UserEnrollmentDto? User { get; set; }
    public DateTime EnrollmentAt { get; set; }
    public bool IsActive { get; set; }
    public bool FinalApproval { get; set; } = false;
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Pending;
    public bool IsManualEnrollment { get; set; } = false;
    public string? QuestionAnswers { get; set; } // JSON object storing answers to course enrollment questions
    public string? LocationDocumentPath { get; set; } // Path to uploaded signed location document
    public EnrollmentType? EnrollmentType { get; set; } // Onsite or Online enrollment type
    public List<CourseEnrollmentApprovalDto>? ApprovalSteps { get; set; }
    public int EmailHistoryCount { get; set; } = 0; // Count of emails sent to this enrollment
    public object? _Debug { get; set; } // Diagnostic info for troubleshooting approval steps
}

public class UserEnrollmentDto
{
    public string Id { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string? UserName { get; set; }
    public int? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }
    public bool? OrganizationIsMain { get; set; }
    public int? DepartmentId { get; set; }
    public string? DepartmentName { get; set; }
    public string? JobTitle { get; set; }
}

public class CreateEnrollmentDto
{
    public int CourseId { get; set; }
    public Dictionary<string, string>? QuestionAnswers { get; set; } // Answers to course enrollment questions
}

public class CreateManualEnrollmentDto
{
    public int CourseId { get; set; }
    public string UserId { get; set; }
    public Dictionary<string, string>? QuestionAnswers { get; set; } // Answers to course enrollment questions
}

public class UpdateLocationDocumentDto
{
    public string FilePath { get; set; } = string.Empty;
}

