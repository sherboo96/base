namespace UMS.Dtos;

public class UserDto
{
    public int Id { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string ADUsername { get; set; } // e.g., domain\username
    public string? CivilNo { get; set; }
    public int? JobTitleId { get; set; }
    public JobTitleDto? JobTitle { get; set; }
    public int OrganizationId { get; set; }
    public int? DepartmentId { get; set; }
    public DateTime? LastLogin { get; set; }
}
