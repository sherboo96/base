using System.Text.Json.Serialization;
using UMS.Models;

namespace UMS.Dtos;

public class EventRegistrationDto
{
    public int? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? NameAr { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public EventRegistrationStatus Status { get; set; } = EventRegistrationStatus.Draft;
    public bool EmailSent { get; set; } = false; // Track if confirmation email was sent
    public DateTime? EmailSentAt { get; set; } // Track when email was sent
    public int EventId { get; set; }
    public EventDto? Event { get; set; }
    
    [JsonPropertyName("eventOrganizationId")]
    public int? EventOrganizationId { get; set; }
    
    public EventOrganizationDto? EventOrganization { get; set; }
    
    [JsonPropertyName("otherOrganization")]
    public string? OtherOrganization { get; set; } // Temporary field for creating new organization
    public List<EventAttendeeDto> Attendees { get; set; } = new();
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

