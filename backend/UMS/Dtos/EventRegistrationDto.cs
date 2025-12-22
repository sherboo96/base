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
    public string? SeatNumber { get; set; } // Seat number for the event
    public EventRegistrationStatus Status { get; set; } = EventRegistrationStatus.Draft;
    public bool EmailSent { get; set; } = false; // Track if confirmation email was sent (deprecated - use specific flags)
    public DateTime? EmailSentAt { get; set; } // Track when email was sent (deprecated - use specific timestamps)
    public bool RegistrationSuccessfulEmailSent { get; set; } = false; // Track if registration successful email was sent
    public DateTime? RegistrationSuccessfulEmailSentAt { get; set; } // Track when registration successful email was sent
    public bool ConfirmationEmailSent { get; set; } = false; // Track if confirmation email (with badge) was sent
    public DateTime? ConfirmationEmailSentAt { get; set; } // Track when confirmation email was sent
    public bool FinalApprovalEmailSent { get; set; } = false; // Track if final approval email (with badge and agenda) was sent
    public DateTime? FinalApprovalEmailSentAt { get; set; } // Track when final approval email was sent
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

