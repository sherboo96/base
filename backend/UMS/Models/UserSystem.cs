using UMS.Models.Shared;

namespace UMS.Models;

public class UserSystem: BaseModel
{
    public int UserId { get; set; }
    public User User { get; set; }

    public int SystemId { get; set; }
    public SystemEntity System { get; set; }

    public string? AccessLevel { get; set; } // Optional - e.g., Read, Write, Admin
}