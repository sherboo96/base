using System;

namespace UMS.Dtos;

public class CourseAttendanceDto
{
    public int Id { get; set; }
    public int CourseEnrollmentId { get; set; }
    public string StudentName { get; set; }
    public string? OrganizationName { get; set; }
    public DateTime CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public double? DurationMinutes { get; set; }
}
