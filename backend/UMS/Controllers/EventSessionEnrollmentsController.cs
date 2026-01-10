using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;
using AutoMapper;
using QRCoder;
using System.Drawing;
using System.Drawing.Imaging;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EventSessionEnrollmentsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<EventSessionEnrollmentsController> _logger;
    private readonly EmailService _emailService;

    public EventSessionEnrollmentsController(IUnitOfWork unitOfWork, IMapper mapper, ILogger<EventSessionEnrollmentsController> logger, EmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _emailService = emailService;
    }

    // Public endpoint - no authentication required
    [AllowAnonymous]
    [HttpPost("public/{sessionId}")]
    public async Task<IActionResult> CreatePublic(int sessionId, [FromBody] EventSessionEnrollmentDto dto)
    {
        _logger.LogInformation($"Received session enrollment request. SessionId: {sessionId}, Name: {dto.Name}, Phone: {dto.Phone}");

        // Validate session exists
        var session = await _unitOfWork.EventSessions.FindAsync(
            x => x.Id == sessionId && !x.IsDeleted,
            new[] { "Event" }
        );

        if (session == null)
        {
            return BadRequest(new BaseResponse<EventSessionEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Session not found.",
                Result = null
            });
        }

        // Check if phone already enrolled for this session
        var existingEnrollment = await _unitOfWork.EventSessionEnrollments.FindAsync(
            x => x.EventSessionId == sessionId && x.Phone == dto.Phone && !x.IsDeleted
        );

        if (existingEnrollment != null)
        {
            return BadRequest(new BaseResponse<EventSessionEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Phone number already enrolled for this session.",
                Result = null
            });
        }

        // Check available seats
        var enrollmentCount = await _unitOfWork.EventSessionEnrollments.CountAsync(
            x => x.EventSessionId == sessionId && !x.IsDeleted && !x.IsCheckedIn
        );

        if (enrollmentCount >= session.AvailableSeats)
        {
            return BadRequest(new BaseResponse<EventSessionEnrollmentDto>
            {
                StatusCode = 400,
                Message = "No available seats for this session.",
                Result = null
            });
        }

        // Normalize barcode if provided (trim and uppercase)
        string? barcode = null;
        if (!string.IsNullOrWhiteSpace(dto.Barcode))
        {
            barcode = dto.Barcode.Trim().ToUpper();

            // Check if barcode already exists for this session
            var existingBarcode = await _unitOfWork.EventSessionEnrollments.FindAsync(
                x => x.EventSessionId == sessionId && x.Barcode == barcode && !x.IsDeleted
            );

            if (existingBarcode != null)
            {
                return BadRequest(new BaseResponse<EventSessionEnrollmentDto>
                {
                    StatusCode = 400,
                    Message = "This barcode/QR code is already registered for this session.",
                    Result = null
                });
            }
        }

        // Handle "Other" organization - create new EventOrganization if provided
        int? eventOrganizationId = dto.EventOrganizationId;
        if (!string.IsNullOrWhiteSpace(dto.OtherOrganization))
        {
            var orgName = dto.OtherOrganization.Trim();
            
            // Check if organization with same name already exists
            var existingOrg = await _unitOfWork.EventOrganizations.FindAsync(
                x => x.Name.ToLower() == orgName.ToLower() && !x.IsDeleted
            );

            if (existingOrg != null)
            {
                eventOrganizationId = existingOrg.Id;
            }
            else
            {
                // Create new organization
                var newOrg = new EventOrganization
                {
                    Name = orgName,
                    NameAr = orgName,
                    CreatedBy = "Public",
                    CreatedOn = DateTime.Now,
                    IsActive = true
                };

                var createdOrgId = await _unitOfWork.EventOrganizations.AddAsync(newOrg);
                await _unitOfWork.CompleteAsync();
                eventOrganizationId = createdOrgId.Id;
            }
        }

        var enrollment = _mapper.Map<EventSessionEnrollment>(dto);
        enrollment.EventSessionId = sessionId;
        enrollment.Barcode = barcode;
        enrollment.EventOrganizationId = eventOrganizationId;
        enrollment.Status = EventSessionEnrollmentStatus.Pending;
        enrollment.CreatedBy = "Public";
        enrollment.CreatedOn = DateTime.Now;
        enrollment.IsActive = true;
        enrollment.IsCheckedIn = false;

        var createdId = await _unitOfWork.EventSessionEnrollments.AddAsync(enrollment);
        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.EventSessionEnrollments.FindAsync(
            x => x.Id == createdId.Id && !x.IsDeleted,
            new[] { "EventSession", "EventOrganization", "EventSession.Event" }
        );

        return CreatedAtAction(nameof(GetById), new { id = createdId.Id }, new BaseResponse<EventSessionEnrollmentDto>
        {
            StatusCode = 201,
            Message = "Enrollment created successfully.",
            Result = MapToDto(result)
        });
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] int? sessionId = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var skip = (page - 1) * pageSize;

        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? (search ?? "").ToLower().Trim() : "";

        Expression<Func<EventSessionEnrollment, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)) ||
             x.Phone.Contains(searchLower) ||
             x.Barcode.Contains(searchLower)) &&
            (!sessionId.HasValue || x.EventSessionId == sessionId.Value);

        Expression<Func<EventSessionEnrollment, object>> orderBy = x => x.CreatedOn;

        var data = await _unitOfWork.EventSessionEnrollments.GetAllAsync(
            pageSize,
            skip,
            filter,
            orderBy,
            "DESC",
            new[] { "EventSession", "EventOrganization", "EventSession.Event" }
        );

        var total = await _unitOfWork.EventSessionEnrollments.CountAsync(filter);

        var dtos = data.Select(e => MapToDto(e)).ToList();

        return Ok(new BaseResponse<List<EventSessionEnrollmentDto>>
        {
            StatusCode = 200,
            Message = "Enrollments retrieved successfully.",
            Result = dtos,
            Total = total,
            Pagination = new Pagination
            {
                CurrentPage = page,
                PageSize = pageSize,
                Total = total
            }
        });
    }

    [HttpGet("{id}")]
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        var enrollment = await _unitOfWork.EventSessionEnrollments.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "EventSession", "EventOrganization", "EventSession.Event" }
        );

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<EventSessionEnrollmentDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found.",
                Result = null
            });
        }

        return Ok(new BaseResponse<EventSessionEnrollmentDto>
        {
            StatusCode = 200,
            Message = "Enrollment retrieved successfully.",
            Result = MapToDto(enrollment)
        });
    }

    [HttpPost("{id}/check-in")]
    [Authorize]
    public async Task<IActionResult> CheckIn(int id)
    {
        var enrollment = await _unitOfWork.EventSessionEnrollments.FindAsync(
            x => x.Id == id && !x.IsDeleted
        );

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Enrollment not found.",
                Result = false
            });
        }

        if (enrollment.IsCheckedIn)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Already checked in.",
                Result = false
            });
        }

        enrollment.IsCheckedIn = true;
        enrollment.CheckedInAt = DateTime.Now;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "System";

        await _unitOfWork.EventSessionEnrollments.UpdateAsync(enrollment);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Checked in successfully.",
            Result = true
        });
    }

    [HttpPost("{id}/approve")]
    [Authorize]
    public async Task<IActionResult> Approve(int id)
    {
        var enrollment = await _unitOfWork.EventSessionEnrollments.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "EventSession", "EventOrganization", "EventSession.Event" }
        );

        if (enrollment == null)
        {
            return NotFound(new BaseResponse<EventSessionEnrollmentDto>
            {
                StatusCode = 404,
                Message = "Enrollment not found.",
                Result = null
            });
        }

        if (enrollment.Status == EventSessionEnrollmentStatus.Approved)
        {
            return BadRequest(new BaseResponse<EventSessionEnrollmentDto>
            {
                StatusCode = 400,
                Message = "Enrollment is already approved.",
                Result = null
            });
        }

        // Update status to Approved
        enrollment.Status = EventSessionEnrollmentStatus.Approved;
        enrollment.UpdatedAt = DateTime.Now;
        enrollment.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "System";

        await _unitOfWork.EventSessionEnrollments.UpdateAsync(enrollment);
        await _unitOfWork.CompleteAsync();

        // Generate QR code image
        byte[] qrCodeBytes;
        try
        {
            using var qrGenerator = new QRCodeGenerator();
            var qrData = qrGenerator.CreateQrCode(enrollment.Barcode, QRCodeGenerator.ECCLevel.M);
            using var qrCode = new PngByteQRCode(qrData);
            qrCodeBytes = qrCode.GetGraphic(20);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating QR code for enrollment {EnrollmentId}", id);
            qrCodeBytes = Array.Empty<byte>();
        }

        // Send approval email with QR code if email is provided
        bool emailSent = false;
        if (!string.IsNullOrWhiteSpace(enrollment.Email))
        {
            var sessionName = enrollment.EventSession?.Title ?? "Session";
            var sessionNameAr = enrollment.EventSession?.TitleAr;
            var sessionDateTime = enrollment.EventSession?.DateTime;
            var eventName = enrollment.EventSession?.Event?.Name ?? "Event";
            var eventNameAr = enrollment.EventSession?.Event?.NameAr;
            var sessionBanner = enrollment.EventSession?.Banner;

            emailSent = await _emailService.SendEventSessionEnrollmentApprovalAsync(
                enrollment.Email,
                enrollment.Name,
                sessionName,
                sessionNameAr,
                sessionDateTime,
                eventName,
                eventNameAr,
                enrollment.Barcode,
                null, // No QR code attachment
                sessionBanner // Session banner URL
            );

            if (emailSent)
            {
                enrollment.ApprovalEmailSent = true;
                enrollment.ApprovalEmailSentAt = DateTime.Now;
                await _unitOfWork.EventSessionEnrollments.UpdateAsync(enrollment);
                await _unitOfWork.CompleteAsync();
            }
        }

        // Reload to get updated status
        var finalEnrollment = await _unitOfWork.EventSessionEnrollments.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "EventSession", "EventOrganization", "EventSession.Event" }
        );

        return Ok(new BaseResponse<EventSessionEnrollmentDto>
        {
            StatusCode = 200,
            Message = emailSent
                ? "Enrollment approved and email sent successfully."
                : string.IsNullOrWhiteSpace(enrollment.Email)
                    ? "Enrollment approved. No email sent (email not provided)."
                    : "Enrollment approved but email sending failed.",
            Result = MapToDto(finalEnrollment)
        });
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.EventSessionEnrollments.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Enrollment not found.",
                Result = false
            });
        }

        await _unitOfWork.EventSessionEnrollments.DeleteAsync(id);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Enrollment deleted successfully.",
            Result = true
        });
    }

    [HttpGet("public/session/{sessionId}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSessionInfo(int sessionId)
    {
        var session = await _unitOfWork.EventSessions.FindAsync(
            x => x.Id == sessionId && !x.IsDeleted,
            new[] { "Event" }
        );

        if (session == null)
        {
            return NotFound(new BaseResponse<object>
            {
                StatusCode = 404,
                Message = "Session not found.",
                Result = null
            });
        }

        var enrollmentCount = await _unitOfWork.EventSessionEnrollments.CountAsync(
            x => x.EventSessionId == sessionId && !x.IsDeleted
        );

        var availableSeats = Math.Max(0, session.AvailableSeats - enrollmentCount);

        return Ok(new BaseResponse<object>
        {
            StatusCode = 200,
            Message = "Session information retrieved successfully.",
            Result = new
            {
                id = session.Id,
                title = session.Title,
                titleAr = session.TitleAr,
                description = session.Description,
                descriptionAr = session.DescriptionAr,
                dateTime = session.DateTime,
                banner = session.Banner,
                availableSeats = availableSeats,
                totalSeats = session.AvailableSeats,
                eventId = session.EventId,
                eventName = session.Event?.Name,
                eventNameAr = session.Event?.NameAr
            }
        });
    }

    [HttpGet("qr/{barcode}")]
    [AllowAnonymous]
    public IActionResult GetQRCode(string barcode)
    {
        try
        {
            using var qrGenerator = new QRCodeGenerator();
            var qrData = qrGenerator.CreateQrCode(barcode, QRCodeGenerator.ECCLevel.M);
            using var qrCode = new PngByteQRCode(qrData);
            var qrCodeBytes = qrCode.GetGraphic(20);

            return File(qrCodeBytes, "image/png", $"qr-{barcode}.png");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating QR code");
            return StatusCode(500, new BaseResponse<string>
            {
                StatusCode = 500,
                Message = $"Error generating QR code: {ex.Message}",
                Result = null
            });
        }
    }

    private string GenerateBarcode(string eventCode, int sessionId)
    {
        // Generate a unique barcode in format: EventCode + SessionId + 5 random digits
        // Example: MASSAR12345678
        if (string.IsNullOrWhiteSpace(eventCode))
        {
            eventCode = "SESSION";
        }

        var random = new Random();
        var randomDigits = random.Next(10000, 99999); // 5-digit number
        var barcode = $"{eventCode.ToUpper()}{sessionId}{randomDigits}";

        // Ensure uniqueness by checking if barcode already exists
        var exists = _unitOfWork.EventSessionEnrollments.CountAsync(
            x => x.Barcode == barcode && !x.IsDeleted
        ).Result > 0;

        int attempts = 0;
        while (exists && attempts < 10)
        {
            randomDigits = random.Next(10000, 99999);
            barcode = $"{eventCode.ToUpper()}{sessionId}{randomDigits}";
            exists = _unitOfWork.EventSessionEnrollments.CountAsync(
                x => x.Barcode == barcode && !x.IsDeleted
            ).Result > 0;
            attempts++;
        }

        return barcode;
    }

    private EventSessionEnrollmentDto MapToDto(EventSessionEnrollment enrollment)
    {
        return new EventSessionEnrollmentDto
        {
            Id = enrollment.Id,
            Name = enrollment.Name,
            NameAr = enrollment.NameAr,
            Phone = enrollment.Phone,
            Email = enrollment.Email,
            Barcode = enrollment.Barcode,
            EventSessionId = enrollment.EventSessionId,
            EventSession = enrollment.EventSession != null ? new EventSessionDto
            {
                Id = enrollment.EventSession.Id,
                Title = enrollment.EventSession.Title,
                TitleAr = enrollment.EventSession.TitleAr,
                DateTime = enrollment.EventSession.DateTime,
                AvailableSeats = enrollment.EventSession.AvailableSeats
            } : null,
            EventOrganizationId = enrollment.EventOrganizationId,
            EventOrganization = enrollment.EventOrganization != null ? new EventOrganizationDto
            {
                Id = enrollment.EventOrganization.Id,
                Name = enrollment.EventOrganization.Name,
                NameAr = enrollment.EventOrganization.NameAr
            } : null,
            Status = enrollment.Status,
            IsCheckedIn = enrollment.IsCheckedIn,
            CheckedInAt = enrollment.CheckedInAt,
            ApprovalEmailSent = enrollment.ApprovalEmailSent,
            ApprovalEmailSentAt = enrollment.ApprovalEmailSentAt,
            IsActive = enrollment.IsActive,
            CreatedAt = enrollment.CreatedOn,
            CreatedBy = enrollment.CreatedBy,
            UpdatedAt = enrollment.UpdatedAt,
            UpdatedBy = enrollment.UpdatedBy
        };
    }
}

