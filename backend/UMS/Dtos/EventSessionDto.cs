namespace UMS.Dtos;

public class EventSessionDto
{
    public int? Id { get; set; }
    public string Title { get; set; }
    public string? TitleAr { get; set; }
    public string? Description { get; set; }
    public string? DescriptionAr { get; set; }
    public int AvailableSeats { get; set; }
    public DateTime DateTime { get; set; }
    public string? Banner { get; set; }
    public int EventId { get; set; }
    public EventDto? Event { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

