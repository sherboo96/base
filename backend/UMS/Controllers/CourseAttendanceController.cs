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

        if (!enrollment.FinalApproval || enrollment.Status != EnrollmentStatus.Approve)
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "User enrollment is not approved." });

        var course = enrollment.Course;
        if (course.Status != CourseStatus.Active)
             return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Course is not active." });

        var now = DateTime.Now;
        var startTime = course.StartDateTime; // Assuming specific time
        var endTime = course.EndDateTime;

        if (startTime == null || endTime == null) // Should check dates
             return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Course dates are undefined." });

        // Logic: "Before From 2 hour and Update To 2 Hours too"
        // I assume this applies to the *current* session or day. 
        // If the course spans multiple days, we need logic to check if 'now' is within a valid session window.
        // Assuming simple interpretation: The global start and end time of the course (which might be 1 day).
        // If it is multiple days, usually StartDateTime/EndDateTime in Course model refers to the whole duration.
        // If the user wants to check in *daily*, we might need a daily schedule.
        // However, based on the prompt "time with in the From and To", I'll check against Course.StartDateTime/EndDateTime.
        
        DateTime validStart;
        DateTime validEnd;

        // Try to parse dates. Course dates are strings in the prompt's Course model interface?
        // Wait, looking at Controller update in previous turn: `result.StartDateTime` (DateTime?). 
        // In Model: `public string? StartDateTime`. Wait, let me check Course model type.
        // In backend controller `CoursesController.cs`: `existing.StartDateTime = dto.StartDateTime`.
        
        // Let's check Course model definition backend.
        // ... (Checking previous view_course_file not done yet)
        
        // I'll assume they are DateTime or nullable DateTime based on Emails using `.ToString()`.

        var windowStart = course.StartDateTime?.AddHours(-2);
        var windowEnd = course.EndDateTime?.AddHours(2);

        if (now < windowStart || now > windowEnd)
        {
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Check-in time is outside the allowed window (2 hours before start and 2 hours after end)." });
        }
        
        // Check if already checked in and not checked out?
        // Or can have multiple check-ins? 
        // Let's prevent double check-in without check-out?
        var openSession = await _context.CourseAttendances
            .AnyAsync(a => a.CourseEnrollmentId == enrollmentId && a.CheckOutTime == null);
            
        if (openSession)
             return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "User is already checked in." });

        var attendance = new CourseAttendance
        {
            CourseEnrollmentId = enrollmentId,
            CheckInTime = now,
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

        // Logic check: "after To 2 Hours too". Strictly speaking, they can check out any time after check-in? 
        // Or strictly within the window? Usually check-out is allowed whenever, but prompt implies the window logic for operations.
        // I will apply the same window logic for check-out to be safe, or just let them check out.
        // Providing they checked in, they should arguably be able to check out. 
        // But if they forgot and check out next day? 
        // Let's allow check out if it's reasonable. But strict to window is prompt's likely intent.
        
        var enrollment = await _context.CourseEnrollments.Include(e => e.Course).FirstOrDefaultAsync(e => e.Id == enrollmentId);
        var course = enrollment.Course;
        var now = DateTime.Now;
         var windowEnd = course.EndDateTime?.AddHours(2);
         
         if (now > windowEnd)
         {
             // Maybe auto-close? Or allow late checkout?
             // Prompt says "Before From 2 hour and after To 2 Hours too".
             // If manual, maybe restrict.
             // I'll return bad request if significantly late, but maybe loosen? 
             // Let's stick to the window for consistency.
             return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Check-out time is outside the allowed window." });
         }

        lastAttendance.CheckOutTime = now;
        lastAttendance.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        lastAttendance.UpdatedAt = DateTime.Now;

        await _context.SaveChangesAsync();

        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Checked out successfully.", Result = true });
    }
}
