using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class CourseEnrollmentApproval : BaseModel
{
    public int Id { get; set; }
    public int CourseEnrollmentId { get; set; }
    public CourseEnrollment CourseEnrollment { get; set; }
    public int CourseTabApprovalId { get; set; }
    public CourseTabApproval CourseTabApproval { get; set; }
    public string? ApprovedBy { get; set; } // UserId who approved
    public DateTime? ApprovedAt { get; set; }
    public bool IsApproved { get; set; } = false;
    public string? Comments { get; set; } // Optional comments
    public bool IsRejected { get; set; } = false; // If rejected at this level
}

