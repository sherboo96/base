using System.Text.Json.Serialization;

namespace UMS.Models;

public class User: BaseModel
{
    public int Id { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string ADUsername { get; set; } // e.g., domain\username
    public string? CivilNo { get; set; }
    public int? JobTitleId { get; set; }
    public JobTitle? JobTitle { get; set; }
    public DateTime? LastLogin { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public bool IsLocked { get; set; } = false;
    [JsonIgnore]
    public ICollection<UserRole> UserRoles { get; set; }
}