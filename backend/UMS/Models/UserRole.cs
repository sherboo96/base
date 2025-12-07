namespace UMS.Models;

public class UserRole
{
    public string UserId { get; set; } // Changed to string for Identity
    public User User { get; set; }

    public int RoleId { get; set; }
    public Role Role { get; set; }
}