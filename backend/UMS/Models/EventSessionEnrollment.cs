using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public enum EventSessionEnrollmentStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2
}

public class EventSessionEnrollment : BaseModel
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? NameAr { get; set; }
    public required string Phone { get; set; }
    public string? Email { get; set; } // Email for sending approval
    public string? Barcode { get; set; } // Optional unique barcode/QR code for check-in
    public int EventSessionId { get; set; }
    
    [JsonIgnore]
    public EventSession? EventSession { get; set; }
    public int? EventOrganizationId { get; set; }
    public EventOrganization? EventOrganization { get; set; }
    public EventSessionEnrollmentStatus Status { get; set; } = EventSessionEnrollmentStatus.Pending;
    public bool IsCheckedIn { get; set; } = false;
    public DateTime? CheckedInAt { get; set; }
    public bool ApprovalEmailSent { get; set; } = false;
    public DateTime? ApprovalEmailSentAt { get; set; }
}

