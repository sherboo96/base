using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;
using UMS.Data;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EventAttendeesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;

    public EventAttendeesController(IUnitOfWork unitOfWork, ApplicationDbContext context)
    {
        _unitOfWork = unitOfWork;
        _context = context;
    }

    [HttpPost("checkin")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        // Find registration by barcode
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Barcode == dto.Barcode && !x.IsDeleted,
            new[] { "Event", "Attendees" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<EventAttendeeDto>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = null
            });
        }

        // Check if already checked in today
        var today = DateTime.Now.Date;
        var existingAttendee = registration.Attendees?.FirstOrDefault(a =>
            a.CheckInDateTime.HasValue &&
            a.CheckInDateTime.Value.Date == today &&
            !a.IsDeleted);

        if (existingAttendee != null)
        {
            return BadRequest(new BaseResponse<EventAttendeeDto>
            {
                StatusCode = 400,
                Message = "Already checked in today.",
                Result = null
            });
        }

        var attendee = new EventAttendee
        {
            EventRegistrationId = registration.Id,
            CheckInDateTime = DateTime.Now,
            CreatedBy = currentUser
        };

        var entity = await _unitOfWork.EventAttendees.AddAsync(attendee);
        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.EventAttendees.FindAsync(
            x => x.Id == ((EventAttendee)entity).Id && !x.IsDeleted,
            new[] { "EventRegistration" }
        );

        return Ok(new BaseResponse<EventAttendeeDto>
        {
            StatusCode = 200,
            Message = "Check-in successful.",
            Result = MapToDto(result)
        });
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> CheckOut([FromBody] CheckOutDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        // Find registration by barcode
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Barcode == dto.Barcode && !x.IsDeleted,
            new[] { "Attendees" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<EventAttendeeDto>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = null
            });
        }

        // Find today's check-in
        var today = DateTime.Now.Date;
        var attendee = registration.Attendees?.FirstOrDefault(a =>
            a.CheckInDateTime.HasValue &&
            a.CheckInDateTime.Value.Date == today &&
            !a.CheckOutDateTime.HasValue &&
            !a.IsDeleted);

        if (attendee == null)
        {
            return BadRequest(new BaseResponse<EventAttendeeDto>
            {
                StatusCode = 400,
                Message = "No check-in found for today.",
                Result = null
            });
        }

        attendee.CheckOutDateTime = DateTime.Now;
        attendee.UpdatedAt = DateTime.Now;
        attendee.UpdatedBy = currentUser;

        await _unitOfWork.EventAttendees.UpdateAsync(attendee);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<EventAttendeeDto>
        {
            StatusCode = 200,
            Message = "Check-out successful.",
            Result = MapToDto(attendee)
        });
    }

    [HttpGet("registration/{registrationId}")]
    public async Task<IActionResult> GetByRegistrationId(int registrationId)
    {
        var attendees = await _unitOfWork.EventAttendees.GetAllAsync(
            x => x.EventRegistrationId == registrationId && !x.IsDeleted,
            new[] { "EventRegistration" }
        );

        var dtos = attendees.Select(a => MapToDto(a)).ToList();

        return Ok(new BaseResponse<List<EventAttendeeDto>>
        {
            StatusCode = 200,
            Message = "Attendees retrieved successfully.",
            Result = dtos
        });
    }

    private EventAttendeeDto MapToDto(EventAttendee attendee)
    {
        return new EventAttendeeDto
        {
            Id = attendee.Id,
            EventRegistrationId = attendee.EventRegistrationId,
            CheckInDateTime = attendee.CheckInDateTime,
            CheckOutDateTime = attendee.CheckOutDateTime,
            IsActive = attendee.IsActive,
            CreatedAt = attendee.CreatedOn,
            CreatedBy = attendee.CreatedBy,
            UpdatedAt = attendee.UpdatedAt,
            UpdatedBy = attendee.UpdatedBy
        };
    }
}

public class CheckInDto
{
    public string Barcode { get; set; } = string.Empty;
}

public class CheckOutDto
{
    public string Barcode { get; set; } = string.Empty;
}

