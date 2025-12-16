namespace UMS.Dtos;

public class EventSpeakerDto
{
    public int? Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public string? BioEn { get; set; }
    public string? BioAr { get; set; }
    public string? From { get; set; }
    public int EventId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

