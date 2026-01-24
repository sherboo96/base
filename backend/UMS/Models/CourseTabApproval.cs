using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class CourseTabApproval : BaseModel
{
    public int Id { get; set; }
    public int CourseTabId { get; set; }
    public CourseTab CourseTab { get; set; }
    public int ApprovalOrder { get; set; } // Order of approval (1, 2, 3, etc.)
    public bool IsHeadApproval { get; set; } = false; // True for the first approval (Head)
    public bool IsFinalApproval { get; set; } = false; // True for the last/final approval step
    public int? RoleId { get; set; } // Nullable - for role-based approvals (after Head)
    public Role? Role { get; set; }
    
    [JsonIgnore]
    public ICollection<CourseEnrollmentApproval> EnrollmentApprovals { get; set; } = new List<CourseEnrollmentApproval>();
}

