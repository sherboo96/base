using System.Text.Json.Serialization;
using UMS.Models;

namespace UMS.Dtos;

public class UserResponseDto
{
    public string Id { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string UserName { get; set; }
    public string? NormalizedUserName { get; set; }
    public string? NormalizedEmail { get; set; }
    public bool EmailConfirmed { get; set; }
    public string? ADUsername { get; set; }
    public string? CivilNo { get; set; }
    public int? JobTitleId { get; set; }
    public JobTitle? JobTitle { get; set; }
    public int FailedLoginAttempts { get; set; }
    public bool IsLocked { get; set; }
    public LoginMethod LoginMethod { get; set; }
    public bool IsTemporaryPassword { get; set; }
    public bool EmailVerified { get; set; }
    public int OrganizationId { get; set; }
    public Organization? Organization { get; set; }
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedOn { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? LastLogin { get; set; }

    public static UserResponseDto FromUser(User user)
    {
        return new UserResponseDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            UserName = user.UserName,
            NormalizedUserName = user.NormalizedUserName,
            NormalizedEmail = user.NormalizedEmail,
            EmailConfirmed = user.EmailConfirmed,
            ADUsername = user.ADUsername,
            CivilNo = user.CivilNo,
            JobTitleId = user.JobTitleId,
            JobTitle = user.JobTitle,
            FailedLoginAttempts = user.FailedLoginAttempts,
            IsLocked = user.IsLocked,
            LoginMethod = user.LoginMethod,
            IsTemporaryPassword = user.IsTemporaryPassword,
            EmailVerified = user.EmailVerified,
            OrganizationId = user.OrganizationId,
            Organization = user.Organization,
            DepartmentId = user.DepartmentId,
            Department = user.Department,
            IsActive = user.IsActive,
            IsDeleted = user.IsDeleted,
            CreatedOn = user.CreatedOn,
            CreatedBy = user.CreatedBy,
            UpdatedAt = user.UpdatedAt,
            UpdatedBy = user.UpdatedBy,
            LastLogin = user.LastLogin
        };
    }
}
