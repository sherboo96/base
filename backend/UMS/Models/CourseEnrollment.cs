using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public enum EnrollmentStatus
{
    Pending = 1,
    Approve = 2,
    Reject = 3,
    Excuse = 4
}

public class CourseEnrollment : BaseModel
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public Course Course { get; set; }
    public string UserId { get; set; }
    public User User { get; set; }
    public DateTime EnrollmentAt { get; set; } = DateTime.Now;
    public bool FinalApproval { get; set; } = false; // True when approved or rejected
    public EnrollmentStatus Status { get; set; } = EnrollmentStatus.Pending; // Pending, Approve, Reject, Excuse
    public bool ConfirmationEmailSent { get; set; } = false; // True when confirmation email has been sent
    
    [JsonIgnore]
    public ICollection<CourseEnrollmentApproval> ApprovalSteps { get; set; } = new List<CourseEnrollmentApproval>();
}

