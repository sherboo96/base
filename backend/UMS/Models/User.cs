using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Identity;

namespace UMS.Models;

public class User : IdentityUser
{
    public string FullName { get; set; }
    public string ADUsername { get; set; } // e.g., domain\username
    public string? CivilNo { get; set; }
    public int? JobTitleId { get; set; }
    public JobTitle? JobTitle { get; set; }
    public DateTime? LastLogin { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public bool IsLocked { get; set; } = false;
    public LoginMethod LoginMethod { get; set; } = LoginMethod.ActiveDirectory; // Default to AD
    public string? TemporaryPassword { get; set; } // For Credentials login method
    public bool IsTemporaryPassword { get; set; } = false; // Flag to force password change on first login
    public bool EmailVerified { get; set; } = false; // For OTP verification method
    
    // Organization and Department relationships
    public int OrganizationId { get; set; } // Required - every user must have an organization
    public Organization Organization { get; set; }
    public int? DepartmentId { get; set; } // Nullable - required only if organization is main
    public Department? Department { get; set; }
    public string? DepartmentRole { get; set; } // "Head" or "Member" - indicates if user is head or member of the department
    
    // BaseModel properties (since IdentityUser doesn't inherit from BaseModel)
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    public DateTime CreatedOn { get; set; } = DateTime.Now;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    
    [JsonIgnore]
    public ICollection<UserRole> UserRoles { get; set; }
}