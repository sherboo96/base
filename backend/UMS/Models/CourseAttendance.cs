using System;
using UMS.Models.Shared;

namespace UMS.Models;

public class CourseAttendance : BaseModel
{
    public int Id { get; set; }
    public int CourseEnrollmentId { get; set; }
    public CourseEnrollment CourseEnrollment { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    
    // Calculate duration in minutes if checked out
    public double? DurationMinutes => CheckOutTime.HasValue 
        ? (CheckOutTime.Value - CheckInTime).TotalMinutes 
        : null;
}
