namespace UMS.Dtos;

public class EmailTemplateDto
{
    public string FileName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class SendBulkEmailRequest
{
    public List<int> EnrollmentIds { get; set; } = new();
    public string TemplateFileName { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public Dictionary<string, string>? TemplateVariables { get; set; }
}
