namespace UMS.Dtos;

public class RoleDto
{
    public string Name { get; set; }
    public bool ApplyToAllOrganizations { get; set; } = false;
    public int? OrganizationId { get; set; }
    public bool IsDefault { get; set; } = false;
}
