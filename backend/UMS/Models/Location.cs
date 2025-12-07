using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public enum LocationCategory
{
    Onsite = 1,
    Online = 2,
    OutSite = 3,
    Abroad = 4
}

public class Location : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string? Floor { get; set; }
    public string? Building { get; set; }
    public LocationCategory Category { get; set; } = LocationCategory.Onsite;
    public int OrganizationId { get; set; }
    public Organization Organization { get; set; }
}
