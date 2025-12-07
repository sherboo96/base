using System.Text.Json.Serialization;

namespace UMS.Models;

public class Role: BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }

    [JsonIgnore]
    public ICollection<RolePermission> RolePermissions { get; set; }
    [JsonIgnore]
    public ICollection<UserRole> UserRoles { get; set; }
}
