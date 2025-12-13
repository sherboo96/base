using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class CourseTab : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string RouteCode { get; set; } // Unique route code for URL routing
    public string Icon { get; set; }
    public int? ExcuseTimeHours { get; set; } // Hours before course start when users can excuse themselves // Icon class name (e.g., "fas fa-book", "material-icons")
    public int OrganizationId { get; set; }
    public Organization Organization { get; set; }
    public bool ShowInMenu { get; set; } = true;
    public bool ShowPublic { get; set; } = false;
    public bool ShowForOtherOrganizations { get; set; } = false; // Show this tab to other organizations (only for main organization)
}
