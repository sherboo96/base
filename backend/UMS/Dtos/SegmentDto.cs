using UMS.Models;

namespace UMS.Dtos;

public class SegmentUserInfoDto
{
    public string Id { get; set; } // GUID as string
    public string FullName { get; set; }
    public string Email { get; set; }
    public string ADUsername { get; set; }
    public string? CivilNo { get; set; }
    public int? JobTitleId { get; set; }
    public JobTitleDto? JobTitle { get; set; }
    public int OrganizationId { get; set; }
    public int? DepartmentId { get; set; }
    public DateTime? LastLogin { get; set; }
    public LoginMethod LoginMethod { get; set; }
    public bool IsActive { get; set; }
}

public class SegmentDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Code { get; set; }
    public int OrganizationId { get; set; }
    public OrganizationDto? Organization { get; set; }
    public List<string>? UserIds { get; set; } // For assigning users
    public List<SegmentUserInfoDto>? Users { get; set; } // For displaying users
    public int UserCount { get; set; } // For listing
    public bool IsActive { get; set; } = true;
    public DateTime CreatedOn { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

public class CreateSegmentDto
{
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Code { get; set; }
    public int OrganizationId { get; set; }
    public List<string>? UserIds { get; set; }
}

public class UpdateSegmentDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Code { get; set; }
    public int OrganizationId { get; set; }
    public List<string>? UserIds { get; set; }
    public bool IsActive { get; set; }
}

public class SegmentUserDto
{
    public int SegmentId { get; set; }
    public List<string> UserIds { get; set; }
}
