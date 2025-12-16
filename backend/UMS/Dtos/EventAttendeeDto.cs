namespace UMS.Dtos;

public class EventAttendeeDto
{
    public int? Id { get; set; }
    public int EventRegistrationId { get; set; }
    public EventRegistrationDto? EventRegistration { get; set; }
    public DateTime? CheckInDateTime { get; set; }
    public DateTime? CheckOutDateTime { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

