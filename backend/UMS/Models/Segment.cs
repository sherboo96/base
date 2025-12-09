using System.Text.Json.Serialization;

namespace UMS.Models;

public class Segment : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; } // English name
    public string NameAr { get; set; } // Arabic name
    public string Code { get; set; } // Unique code/identifier
    public int OrganizationId { get; set; }
    public Organization Organization { get; set; }
    
    // Many-to-many relationship with Users
    [JsonIgnore]
    public ICollection<UserSegment> UserSegments { get; set; }
}
