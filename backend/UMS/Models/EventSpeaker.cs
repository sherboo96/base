using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class EventSpeaker : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public string? BioEn { get; set; }
    public string? BioAr { get; set; }
    public string? From { get; set; } // Organization/Institution name
    public int EventId { get; set; }
    public Event Event { get; set; }
}

