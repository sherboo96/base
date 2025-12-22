using UMS.Models;

namespace UMS.Dtos;

public class EventDto
{
    public int? Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAr { get; set; }
    public string Code { get; set; }
    public string? Poster { get; set; }
    public string? Badge { get; set; } // Path to badge template file
    public string? Agenda { get; set; } // Path to agenda PDF file
    public DateTime? Date { get; set; } // Event date
    public bool Published { get; set; } = false;
    public int? LocationId { get; set; }
    public LocationDto? Location { get; set; }
    public List<int> SpeakerIds { get; set; } = new();
    public List<EventSpeakerDto> Speakers { get; set; } = new();
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

