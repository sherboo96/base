using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public enum LoginMethod
{
    KMNID = 1,
    ActiveDirectory = 2,
    Credentials = 3
}

public class SystemEntity: BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Code { get; set; }
    public string ServerIP { get; set; }
    public string Domain { get; set; }
    public string Database { get; set; }
    public DateTime? StartDate { get; set; }
    public LoginMethod LoginMethod { get; set; } = LoginMethod.ActiveDirectory;

    [JsonIgnore]
    public ICollection<Permission> Permissions { get; set; }
    [JsonIgnore]
    public ICollection<RoleSystem> RoleSystems { get; set; }
    [JsonIgnore]
    public ICollection<UserSystem> UserSystems { get; set; }
}