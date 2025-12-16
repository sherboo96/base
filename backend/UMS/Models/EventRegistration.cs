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
    public string Barcode { get; set; } // Unique barcode for check-in
    public EventRegistrationStatus Status { get; set; } = EventRegistrationStatus.Draft; // Default to Draft
    public bool EmailSent { get; set; } = false; // Track if confirmation email was sent
    public DateTime? EmailSentAt { get; set; } // Track when email was sent
    public int EventId { get; set; }
    public Event Event { get; set; }
    public int? EventOrganizationId { get; set; }
    public EventOrganization? EventOrganization { get; set; }

    [JsonIgnore]
    public ICollection<EventAttendee> Attendees { get; set; } = new List<EventAttendee>();
}

