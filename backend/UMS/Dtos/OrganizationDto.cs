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
