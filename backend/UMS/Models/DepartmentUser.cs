using System.Text.Json.Serialization;

namespace UMS.Models;

public class DepartmentUser : BaseModel
{
    public int DepartmentId { get; set; }
    public Department Department { get; set; }

    public int UserId { get; set; }
    [JsonIgnore]
    public User User { get; set; }

    public string AssignmentType { get; set; } // Primary, ByProxy, Secondary
    public int? OrderIndex { get; set; } // For ordering users within the same department
}

