namespace UMS.Dtos;

public class CourseTabDto
{
    public int? Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string RouteCode { get; set; } // Unique route code for URL routing
    public string Icon { get; set; }
    public int? ExcuseTimeHours { get; set; } // Icon class name (e.g., "fas fa-book", "material-icons")
    public int OrganizationId { get; set; }
    public bool ShowInMenu { get; set; } = true;
    public bool ShowPublic { get; set; } = false;
    public bool ShowForOtherOrganizations { get; set; } = false; // Show this tab to other organizations (only for main organization)
    public bool ShowDigitalLibraryInMenu { get; set; } = false; // Show this tab in Digital Library section for management
    public bool ShowDigitalLibraryPublic { get; set; } = false; // Show this tab in Digital Library section for public
    public List<CourseTabApprovalDto>? Approvals { get; set; }
}
