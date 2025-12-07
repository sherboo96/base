using System.Text.Json.Serialization;

namespace UMS.Models;

public class Permission: BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Code { get; set; }
    
    [JsonIgnore]
    public ICollection<RolePermission> RolePermissions { get; set; }
}
