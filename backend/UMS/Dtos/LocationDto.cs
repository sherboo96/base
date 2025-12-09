using UMS.Models;

namespace UMS.Dtos;

public class LocationDto
{
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string? Floor { get; set; }
    public string? Building { get; set; }
    public LocationCategory Category { get; set; } = LocationCategory.Onsite;
    public int OrganizationId { get; set; }
    public string? Logo { get; set; } // Path to logo file
    public string? Template { get; set; } // Path to template file
}
