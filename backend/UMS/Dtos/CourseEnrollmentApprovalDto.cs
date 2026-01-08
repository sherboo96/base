namespace UMS.Dtos;

public class CourseEnrollmentApprovalDto
{
    public int Id { get; set; }
    public int CourseEnrollmentId { get; set; }
    public int CourseTabApprovalId { get; set; }
    public CourseTabApprovalDto? CourseTabApproval { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public bool IsApproved { get; set; } = false;
    public bool IsRejected { get; set; } = false;
    public string? Comments { get; set; }
    public UserEnrollmentDto? ApprovedByUser { get; set; }
}

public class ApproveEnrollmentStepDto
{
    public int CourseEnrollmentId { get; set; }
    public int CourseTabApprovalId { get; set; }
    public string? Comments { get; set; }
    public EnrollmentType? EnrollmentType { get; set; } // Onsite or Online enrollment type (for final step)
}

public class RejectEnrollmentStepDto
{
    public int CourseEnrollmentId { get; set; }
    public int CourseTabApprovalId { get; set; }
    public string? Comments { get; set; }
}

