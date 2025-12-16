using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class EventOrganization : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }

    [JsonIgnore]
    public ICollection<EventRegistration> Registrations { get; set; } = new List<EventRegistration>();
}

