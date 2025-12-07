namespace UMS.Dtos;

public class DepartmentDto
{
    public string NameEn { get; set; }
    public string NameAr { get; set; }
    public string? Code { get; set; } // Optional
    public string Type { get; set; }
    public string Level { get; set; }
    public int OrganizationId { get; set; }
    public int? ParentDepartmentId { get; set; }
}
