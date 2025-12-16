using UMS.Models.Shared;

namespace UMS.Models;

public class Log : BaseModel
{
    public int Id { get; set; }
    public string Level { get; set; } = string.Empty; // Information, Warning, Error, Critical, Debug, Trace
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; } // Full exception details
    public string? StackTrace { get; set; }
    public string? Source { get; set; } // Controller, Service, etc.
    public string? Action { get; set; } // Method name or action
    public string? UserId { get; set; } // User who triggered the action
    public string? UserName { get; set; }
    public string? IpAddress { get; set; }
    public string? RequestPath { get; set; }
    public string? RequestMethod { get; set; } // GET, POST, PUT, DELETE
    public string? RequestQueryString { get; set; }
    public string? RequestBody { get; set; } // For POST/PUT requests
    public int? StatusCode { get; set; } // HTTP status code
    public string? ResponseTime { get; set; } // Response time in milliseconds
    public string? MachineName { get; set; }
    public string? Environment { get; set; } // Development, Production, etc.
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

