using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class EventSession : BaseModel
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? TitleAr { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAr { get; set; }
    public int AvailableSeats { get; set; }
    public DateTime DateTime { get; set; }
    public string? Banner { get; set; } // Path to banner file
    public int EventId { get; set; }
    
    [JsonIgnore]
    public Event? Event { get; set; }

    [JsonIgnore]
    public ICollection<EventSessionEnrollment> Enrollments { get; set; } = new List<EventSessionEnrollment>();
}

