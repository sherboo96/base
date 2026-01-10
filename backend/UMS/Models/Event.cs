using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class Event : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAr { get; set; }
    public string Code { get; set; } // Unique code for public access
    public string? Poster { get; set; } // Path to poster file
    public string? Badge { get; set; } // Path to badge template file
    public string? Agenda { get; set; } // Path to agenda PDF file
    public DateTime? Date { get; set; } // Event date
    public bool Published { get; set; } = false;
    public int? LocationId { get; set; }
    public Location? Location { get; set; }

    [JsonIgnore]
    public ICollection<EventSpeaker> Speakers { get; set; } = new List<EventSpeaker>();

    [JsonIgnore]
    public ICollection<EventRegistration> Registrations { get; set; } = new List<EventRegistration>();

    [JsonIgnore]
    public ICollection<EventSession> Sessions { get; set; } = new List<EventSession>();
}

