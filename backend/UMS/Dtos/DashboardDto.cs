namespace UMS.Dtos;

public class DashboardDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int InactiveUsers { get; set; }
    public int LockedUsers { get; set; }
    public int TotalOrganizations { get; set; }
    public int TotalDepartments { get; set; }
    public int TotalRoles { get; set; }
    public int TotalSegments { get; set; }
    public int TotalLocations { get; set; }
    public int TotalInstructors { get; set; }
    public int TotalInstitutions { get; set; }
    public int TotalAdoptionUsers { get; set; }
    public int TotalJobTitles { get; set; }
    public int TotalPositions { get; set; }
    public Dictionary<string, int> UsersByLoginMethod { get; set; } = new Dictionary<string, int>();
    public Dictionary<string, int> UsersByOrganization { get; set; } = new Dictionary<string, int>();
    public int UsersWithTemporaryPassword { get; set; }
}
