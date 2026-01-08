using System.Text.Json.Serialization;

namespace UMS.Models;

public enum AttendanceType
{
    Optional = 1,
    Mandatory = 2
}

public class AdoptionUser : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Email { get; set; }
    public string? Bio { get; set; }
    public int OrganizationId { get; set; }
    public Organization Organization { get; set; }
}
