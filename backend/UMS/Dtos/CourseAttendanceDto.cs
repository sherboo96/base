using System;
using System.Text.Json.Serialization;

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

/// <summary>
/// Request DTO for barcode-based course check-in/check-out.
/// Barcode format: {courseId}_{userId}
/// </summary>
public class CourseAttendanceBarcodeRequestDto
{
    [JsonPropertyName("barcode")]
    public string Barcode { get; set; } = string.Empty;
}

/// <summary>
/// DTO for an onsite enrollment in the mobile attendance view. Includes latest attendance state for manual check-in/out.
/// </summary>
public class CourseEnrollmentForAttendanceDto
{
    public int Id { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public int? OrganizationId { get; set; }
    public string? OrganizationName { get; set; }
    public string? Barcode { get; set; }  // {courseId}_{userId} for search-by-scan
    public DateTime? CheckInTime { get; set; }
    public DateTime? CheckOutTime { get; set; }
    public bool IsCheckedIn { get; set; }
}
