using System.Text.Json.Serialization;
using UMS.Models;

namespace UMS.Dtos;

public class OrganizationDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Code { get; set; }
    public string Domain { get; set; }
    public bool IsMain { get; set; }
    public string? AllowedLoginMethods { get; set; }
    
    public LoginMethod DefaultLoginMethod { get; set; } = LoginMethod.OTPVerification;
    
    public bool IsActive { get; set; }
}

public class BulkOrganizationUploadDto
{
    public string NameEn { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
}

public class BulkOrganizationUploadResponse
{
    public int TotalProcessed { get; set; }
    public int SuccessfullyAdded { get; set; }
    public int Skipped { get; set; }
    public List<string> SkippedDomains { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}
