namespace UMS.Models;

public class UserSegment
{
    public string UserId { get; set; }
    public User User { get; set; }
    
    public int SegmentId { get; set; }
    public Segment Segment { get; set; }
    
    public DateTime AssignedOn { get; set; } = DateTime.Now;
    public string? AssignedBy { get; set; }
}
