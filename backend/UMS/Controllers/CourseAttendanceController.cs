using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UMS.Data;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using System.Security.Claims;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CourseAttendanceController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CourseAttendanceController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Parse barcode in format {courseId}_{userId} into (courseId, userId).
    /// Returns (null, null) if invalid.
    /// </summary>
    private static (int? courseId, string? userId) ParseBarcode(string? barcode)
    {
        if (string.IsNullOrWhiteSpace(barcode)) return (null, null);
        var parts = barcode.Trim().Split(new[] { '_' }, 2, StringSplitOptions.None);
        if (parts.Length != 2) return (null, null);
        if (!int.TryParse(parts[0].Trim(), out var courseId) || courseId <= 0) return (null, null);
        var userId = parts[1].Trim();
        if (string.IsNullOrEmpty(userId)) return (null, null);
        return (courseId, userId);
    }

    /// <summary>
    /// Get all approved onsite enrollments for a course, with latest attendance state. Used for mobile attendance view with manual check-in/out and filter by organization.
    /// </summary>
    [HttpGet("course/{courseId}/enrollments")]
    public async Task<IActionResult> GetEnrollmentsForAttendance(int courseId)
    {
        var enrollments = await _context.CourseEnrollments
            .Include(e => e.User).ThenInclude(u => u.Organization)
            .Where(e => e.CourseId == courseId && !e.IsDeleted
                && e.Status == EnrollmentStatus.Approve && e.FinalApproval
                && (e.EnrollmentType == null || e.EnrollmentType == EnrollmentType.Onsite))
            .ToListAsync();

        var enrollmentIds = enrollments.Select(e => e.Id).ToList();
        var attendances = await _context.CourseAttendances
            .Where(a => enrollmentIds.Contains(a.CourseEnrollmentId))
            .OrderByDescending(a => a.CheckInTime)
            .ToListAsync();

        var result = enrollments.Select(e =>
        {
            var open = attendances.FirstOrDefault(a => a.CourseEnrollmentId == e.Id && a.CheckOutTime == null);
            var last = attendances.FirstOrDefault(a => a.CourseEnrollmentId == e.Id);
            return new CourseEnrollmentForAttendanceDto
            {
                Id = e.Id,
                StudentName = e.User.FullName,
                OrganizationId = e.User.OrganizationId,
                OrganizationName = e.User.Organization?.Name,
                Barcode = $"{courseId}_{e.UserId}",
                CheckInTime = open?.CheckInTime ?? last?.CheckInTime,
                CheckOutTime = open != null ? null : last?.CheckOutTime,
                IsCheckedIn = open != null
            };
        }).ToList();

        return Ok(new BaseResponse<List<CourseEnrollmentForAttendanceDto>>
        {
            StatusCode = 200,
            Message = "Enrollments retrieved successfully.",
            Result = result
        });
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetAttendanceByCourse(int courseId)
    {
        var attendances = await _context.CourseAttendances
            .Include(a => a.CourseEnrollment)
                .ThenInclude(e => e.User)
                    .ThenInclude(u => u.Organization)
            .Where(a => a.CourseEnrollment.CourseId == courseId)
            .OrderByDescending(a => a.CheckInTime)
            .Select(a => new CourseAttendanceDto
            {
                Id = a.Id,
                CourseEnrollmentId = a.CourseEnrollmentId,
                StudentName = a.CourseEnrollment.User.FullName,
                OrganizationName = a.CourseEnrollment.User.Organization != null ? a.CourseEnrollment.User.Organization.Name : null,
                CheckInTime = a.CheckInTime,
                CheckOutTime = a.CheckOutTime,
                DurationMinutes = a.DurationMinutes
            })
            .ToListAsync();

        return Ok(new BaseResponse<List<CourseAttendanceDto>>
        {
            StatusCode = 200,
            Message = "Attendance records retrieved successfully.",
            Result = attendances
        });
    }

    [HttpPost("check-in/{enrollmentId}")]
    public async Task<IActionResult> CheckIn(int enrollmentId)
    {
        var enrollment = await _context.CourseEnrollments
            .Include(e => e.Course)
            .FirstOrDefaultAsync(e => e.Id == enrollmentId);

        if (enrollment == null)
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Enrollment not found." });

        return await CheckInCore(enrollment);
    }

    private async Task<IActionResult> CheckInCore(CourseEnrollment enrollment)
    {
        if (!enrollment.FinalApproval || enrollment.Status != EnrollmentStatus.Approve)
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "User enrollment is not approved." });

        var course = enrollment.Course;
        if (course == null || course.Status != CourseStatus.Active)
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Course is not active." });

        var openSession = await _context.CourseAttendances
            .AsNoTracking()
            .AnyAsync(a => a.CourseEnrollmentId == enrollment.Id && a.CheckOutTime == null);

        if (openSession)
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "User is already checked in." });

        var attendance = new CourseAttendance
        {
            CourseEnrollmentId = enrollment.Id,
            CheckInTime = DateTime.Now,
            CreatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System"
        };

        _context.CourseAttendances.Add(attendance);
        await _context.SaveChangesAsync();

        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Checked in successfully.", Result = true });
    }

    [HttpPost("check-out/{enrollmentId}")]
    public async Task<IActionResult> CheckOut(int enrollmentId)
    {
        var lastAttendance = await _context.CourseAttendances
            .Where(a => a.CourseEnrollmentId == enrollmentId && a.CheckOutTime == null)
            .OrderByDescending(a => a.CheckInTime)
            .FirstOrDefaultAsync();

        if (lastAttendance == null)
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "No active check-in found." });

        var now = DateTime.Now;
        lastAttendance.CheckOutTime = now;
        lastAttendance.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        lastAttendance.UpdatedAt = now;

        await _context.SaveChangesAsync();

        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Checked out successfully.", Result = true });
    }

    /// <summary>
    /// Check-in an onsite course enrollment by scanning the badge barcode (format: {courseId}_{userId}).
    /// Only onsite enrollments can be checked in. Time window: 1 hour before start to 1 hour after end.
    /// </summary>
    [HttpPost("checkin-by-barcode")]
    public async Task<IActionResult> CheckInByBarcode([FromBody] CourseAttendanceBarcodeRequestDto? dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Barcode))
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Request body with 'barcode' is required. Expected: { \"barcode\": \"{courseId}_{userId}\" }." });
        var (courseId, userId) = ParseBarcode(dto.Barcode);
        if (!courseId.HasValue || string.IsNullOrEmpty(userId))
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Invalid barcode format. Expected: {courseId}_{userId}." });

        var enrollment = await _context.CourseEnrollments
            .Include(e => e.Course)
            .FirstOrDefaultAsync(e => e.CourseId == courseId.Value && e.UserId == userId && !e.IsDeleted);

        if (enrollment == null)
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Enrollment not found for this barcode." });

        if (enrollment.EnrollmentType == EnrollmentType.Online)
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Check-in is only allowed for onsite enrollments. This enrollment is online." });

        return await CheckInCore(enrollment);
    }

    /// <summary>
    /// Check-out an onsite course enrollment by scanning the badge barcode (format: {courseId}_{userId}).
    /// </summary>
    [HttpPost("checkout-by-barcode")]
    public async Task<IActionResult> CheckOutByBarcode([FromBody] CourseAttendanceBarcodeRequestDto? dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Barcode))
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Request body with 'barcode' is required. Expected: { \"barcode\": \"{courseId}_{userId}\" }." });
        var (courseId, userId) = ParseBarcode(dto.Barcode);
        if (!courseId.HasValue || string.IsNullOrEmpty(userId))
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Invalid barcode format. Expected: {courseId}_{userId}." });

        var enrollment = await _context.CourseEnrollments
            .Include(e => e.Course)
            .FirstOrDefaultAsync(e => e.CourseId == courseId.Value && e.UserId == userId && !e.IsDeleted);

        if (enrollment == null)
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Enrollment not found for this barcode." });

        if (enrollment.EnrollmentType == EnrollmentType.Online)
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Check-out is only for onsite enrollments. This enrollment is online." });

        return await CheckOut(enrollment.Id);
    }
}
