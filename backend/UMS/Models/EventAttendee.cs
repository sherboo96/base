using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class EventAttendee : BaseModel
{
    public int Id { get; set; }
    public int EventRegistrationId { get; set; }
    public EventRegistration EventRegistration { get; set; }
    public DateTime? CheckInDateTime { get; set; }
    public DateTime? CheckOutDateTime { get; set; }
}

