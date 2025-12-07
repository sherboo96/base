namespace UMS.Dtos;

public class StructureDto
{
    public int? ParentId { get; set; }
    public int? OrderIndex { get; set; }
    public int? DepartmentId { get; set; }
    public List<StructureUserDto>? AssignedUsers { get; set; }
}

