using System.Text.Json.Serialization;

namespace UMS.Models;

public class Department: BaseModel
{
    public int Id { get; set; }
    public string NameEn { get; set; } // English name
    public string NameAr { get; set; } // Arabic name
    public string Code { get; set; } // Unique code/identifier
    public string Type { get; set; } // Type: Minister, Undersecretary, Director, Supervisor, DepartmentHead, etc.
    public string Level { get; set; } // Level: Agent, Director, Supervisor, DepartmentHead (from the legend)
    public int OrganizationId { get; set; }
    public Organization Organization { get; set; }
    public int? ParentDepartmentId { get; set; }
    public Department? ParentDepartment { get; set; }
}