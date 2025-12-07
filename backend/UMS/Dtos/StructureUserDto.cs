namespace UMS.Dtos;

public class StructureUserDto
{
    public int StructureId { get; set; }
    public int UserId { get; set; }
    public string AssignmentType { get; set; } // Primary, ByProxy, Secondary
    public int? OrderIndex { get; set; }
    public UserDto? User { get; set; }
}

public class AssignUserToStructureDto
{
    public int UserId { get; set; }
    public string AssignmentType { get; set; } // Primary, ByProxy, Secondary
    public int? OrderIndex { get; set; }
}

