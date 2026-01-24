namespace UMS.Dtos;

public class CourseTabApprovalDto
{
    public int? Id { get; set; }
    public int CourseTabId { get; set; }
    public int ApprovalOrder { get; set; }
    public bool IsHeadApproval { get; set; } = false;
    public bool IsFinalApproval { get; set; } = false;
    public int? RoleId { get; set; }
    public RoleDto? Role { get; set; }
    public CourseTabDto? CourseTab { get; set; }
}

public class CreateCourseTabApprovalDto
{
    public int CourseTabId { get; set; }
    public int ApprovalOrder { get; set; }
    public bool IsHeadApproval { get; set; } = false;
    public bool IsFinalApproval { get; set; } = false;
    public int? RoleId { get; set; }
}

public class UpdateCourseTabApprovalDto
{
    public int ApprovalOrder { get; set; }
    public bool IsHeadApproval { get; set; } = false;
    public bool IsFinalApproval { get; set; } = false;
    public int? RoleId { get; set; }
}

