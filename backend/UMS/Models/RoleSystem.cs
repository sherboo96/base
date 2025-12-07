namespace UMS.Models;

public class RoleSystem
{
    public int RoleId { get; set; }
    public Role Role { get; set; }

    public int SystemId { get; set; }
    public SystemEntity System { get; set; }
}
