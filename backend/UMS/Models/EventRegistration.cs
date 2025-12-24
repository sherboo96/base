using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class EventRegistration : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string? NameAr { get; set; }
    public string Phone { get; set; }
    public string Email { get; set; }
    public string? JobTitle { get; set; }
    public string Barcode { get; set; } // Unique barcode for check-in
    public string? SeatNumber { get; set; } // Seat number for the event
    public EventRegistrationStatus Status { get; set; } = EventRegistrationStatus.Draft; // Default to Draft
    public bool EmailSent { get; set; } = false; // Track if confirmation email was sent (deprecated - use specific flags)
    public DateTime? EmailSentAt { get; set; } // Track when email was sent (deprecated - use specific timestamps)
    public bool RegistrationSuccessfulEmailSent { get; set; } = false; // Track if registration successful email was sent
    public DateTime? RegistrationSuccessfulEmailSentAt { get; set; } // Track when registration successful email was sent
    public bool ConfirmationEmailSent { get; set; } = false; // Track if confirmation email (with badge) was sent
    public DateTime? ConfirmationEmailSentAt { get; set; } // Track when confirmation email was sent
    public bool FinalApprovalEmailSent { get; set; } = false; // Track if final approval email (with badge and agenda) was sent
    public DateTime? FinalApprovalEmailSentAt { get; set; } // Track when final approval email was sent
    public int EventId { get; set; }
    public Event Event { get; set; }
    public int? EventOrganizationId { get; set; }
    public EventOrganization? EventOrganization { get; set; }

    [JsonIgnore]
    public ICollection<EventAttendee> Attendees { get; set; } = new List<EventAttendee>();
}

