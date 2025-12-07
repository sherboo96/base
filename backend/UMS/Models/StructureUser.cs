using System.Text.Json.Serialization;

namespace UMS.Models;

public class StructureUser : BaseModel
{
    public int StructureId { get; set; }
    public Structure Structure { get; set; }

    public int UserId { get; set; }
    public User User { get; set; }

    public string AssignmentType { get; set; } // Primary, ByProxy, Secondary
    public int? OrderIndex { get; set; } // For ordering users within the same structure
}

