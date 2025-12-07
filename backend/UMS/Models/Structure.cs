using System.Text.Json.Serialization;

namespace UMS.Models;

public class Structure : BaseModel
{
    public int Id { get; set; }
    public int? ParentId { get; set; } // Self-referencing for hierarchy
    public Structure? Parent { get; set; }
    public int? OrderIndex { get; set; } // For ordering at the same level
    public int? DepartmentId { get; set; } // Link to Department
    public Department? Department { get; set; }

    [JsonIgnore]
    public ICollection<Structure> Children { get; set; }

    [JsonIgnore]
    public ICollection<StructureUser> StructureUsers { get; set; }
}

