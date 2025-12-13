using UMS.Models;

namespace UMS.Dtos;

public class UserDto
{
    public int Id { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string? Username { get; set; } // Username for login (optional, defaults to email)
    public string? ADUsername { get; set; } // e.g., domain\username (optional for Credentials login method)
    public string? CivilNo { get; set; }
    public int? JobTitleId { get; set; }
    public JobTitleDto? JobTitle { get; set; }
    public int OrganizationId { get; set; }
    public int? DepartmentId { get; set; }
    public string? DepartmentRole { get; set; } // "Head" or "Member"
    public DateTime? LastLogin { get; set; }
    public LoginMethod LoginMethod { get; set; } = LoginMethod.ActiveDirectory;
    public string? TemporaryPassword { get; set; }
    public bool IsTemporaryPassword { get; set; } = false;
    public bool EmailVerified { get; set; } = false;
    public List<int>? RoleIds { get; set; } // For role assignment
}
