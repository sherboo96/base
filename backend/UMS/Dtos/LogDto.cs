namespace UMS.Dtos;

public class LogDto
{
    public int Id { get; set; }
    public string Level { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public string? StackTrace { get; set; }
    public string? Source { get; set; }
    public string? Action { get; set; }
    public string? UserId { get; set; }
    public string? UserName { get; set; }
    public string? IpAddress { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; }
    public string? RequestQueryString { get; set; }
    public int? StatusCode { get; set; }
    public string? MachineName { get; set; }
    public string? Environment { get; set; }
    public DateTime Timestamp { get; set; }
    public DateTime CreatedOn { get; set; }
}

