using UMS.Models;

namespace UMS.Dtos;

public class EventSessionEnrollmentDto
{
    public int? Id { get; set; }
    public required string Name { get; set; }
    public string? NameAr { get; set; }
    public required string Phone { get; set; }
    public string? Email { get; set; }
    public string? Barcode { get; set; }
    public int EventSessionId { get; set; }
    public EventSessionDto? EventSession { get; set; }
    public int? EventOrganizationId { get; set; }
    public EventOrganizationDto? EventOrganization { get; set; }
    public string? OtherOrganization { get; set; } // For "Other" organization option
    public EventSessionEnrollmentStatus Status { get; set; } = EventSessionEnrollmentStatus.Pending;
    public bool IsCheckedIn { get; set; } = false;
    public DateTime? CheckedInAt { get; set; }
    public bool ApprovalEmailSent { get; set; } = false;
    public DateTime? ApprovalEmailSentAt { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

