namespace UMS.Dtos;

public class DepartmentUserDto
{
    public int DepartmentId { get; set; }
    public int UserId { get; set; }
    public string AssignmentType { get; set; } // Primary, ByProxy, Secondary
    public int? OrderIndex { get; set; }
    public UserDto? User { get; set; }
}

public class AssignUserToDepartmentDto
{
    public int UserId { get; set; }
    public string AssignmentType { get; set; } // Primary, ByProxy, Secondary
    public int? OrderIndex { get; set; }
}

