using UMS.Models;

namespace UMS.Dtos;

public class LocationDto
{
    public int? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public string? Floor { get; set; }
    public string? Building { get; set; }
    public LocationCategory Category { get; set; } = LocationCategory.Onsite;
    public int OrganizationId { get; set; }
    public string? Logo { get; set; } // Path to logo file
    public string? Template { get; set; } // Path to template file
    public string? Url { get; set; } // Optional URL link
}
