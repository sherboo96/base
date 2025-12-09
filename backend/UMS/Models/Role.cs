using System.Text.Json.Serialization;

namespace UMS.Models;

public class Role: BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public bool ApplyToAllOrganizations { get; set; } = false; // If true, permissions apply to all organizations; if false, only to role's organization
    public int? OrganizationId { get; set; } // Organization this role belongs to (nullable for roles that apply to all organizations)
    public Organization? Organization { get; set; }
    public bool IsDefault { get; set; } = false; // If true, this role is assigned by default to new users in the organization

    [JsonIgnore]
    public ICollection<RolePermission> RolePermissions { get; set; }
    [JsonIgnore]
    public ICollection<UserRole> UserRoles { get; set; }
}
