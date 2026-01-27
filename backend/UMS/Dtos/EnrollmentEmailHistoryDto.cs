namespace UMS.Dtos;

public class EnrollmentEmailHistoryDto
{
    public int Id { get; set; }
    public int CourseEnrollmentId { get; set; }
    public string TemplateFileName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string EmailBody { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public string SentBy { get; set; } = string.Empty;
}
