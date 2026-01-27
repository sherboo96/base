using UMS.Models.Shared;

namespace UMS.Models;

public class EnrollmentEmailHistory : BaseModel
{
    public int Id { get; set; }
    public int CourseEnrollmentId { get; set; }
    public CourseEnrollment CourseEnrollment { get; set; }
    public string TemplateFileName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string EmailBody { get; set; } = string.Empty; // Store the rendered email template
    public DateTime SentAt { get; set; } = DateTime.Now;
    public bool IsSuccess { get; set; } = true;
    public string? ErrorMessage { get; set; }
    public string SentBy { get; set; } = string.Empty; // User who sent the email
}
