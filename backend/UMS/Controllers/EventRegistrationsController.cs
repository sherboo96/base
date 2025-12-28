using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;
using UMS.Data;
using UMS.Services;
using System.Text;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.Drawing;
using SixLabors.Fonts;
using QRCoder;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EventRegistrationsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;
    private readonly EmailService _emailService;
    private readonly ILogger<EventRegistrationsController> _logger;
    private readonly IServiceProvider _serviceProvider;

    public EventRegistrationsController(IUnitOfWork unitOfWork, ApplicationDbContext context, IWebHostEnvironment env, EmailService emailService, ILogger<EventRegistrationsController> logger, IServiceProvider serviceProvider)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _env = env;
        _emailService = emailService;
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    // Public endpoint - no authentication required
    [AllowAnonymous]
    [HttpPost("public")]
    public async Task<IActionResult> CreatePublic([FromBody] EventRegistrationDto dto)
    {
        _logger.LogInformation($"Received registration request. EventId: {dto.EventId}, Email: {dto.Email}, OtherOrganization: {dto.OtherOrganization ?? "null"}");
        
        // Validate event exists and is published
        var eventEntity = await _unitOfWork.Events.FindAsync(
            x => x.Id == dto.EventId && x.Published && !x.IsDeleted
        );

        if (eventEntity == null)
        {
            return BadRequest(new BaseResponse<EventRegistrationDto>
            {
                StatusCode = 400,
                Message = "Event not found or not published.",
                Result = null
            });
        }

        // Check if email already registered for this event
        var existingRegistration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.EventId == dto.EventId && x.Email == dto.Email && !x.IsDeleted
        );

        if (existingRegistration != null)
        {
            return BadRequest(new BaseResponse<EventRegistrationDto>
            {
                StatusCode = 400,
                Message = "Email already registered for this event.",
                Result = null
            });
        }

        // Generate unique barcode using event code
        var barcode = GenerateBarcode(eventEntity.Code);

        // Handle "Other" organization - create new EventOrganization if provided
        int? eventOrganizationId = dto.EventOrganizationId;
        bool isOtherOrganization = !string.IsNullOrWhiteSpace(dto.OtherOrganization);
        
        _logger.LogInformation($"Processing registration. OtherOrganization provided: {isOtherOrganization}, Value: {dto.OtherOrganization}");
        
        if (isOtherOrganization)
        {
            var orgName = dto.OtherOrganization.Trim();
            _logger.LogInformation($"Creating or finding EventOrganization with name: {orgName}");
            
            // Check if organization with same name already exists
            var existingOrg = await _unitOfWork.EventOrganizations.FindAsync(
                x => x.Name.ToLower() == orgName.ToLower() && !x.IsDeleted
            );

            if (existingOrg == null)
            {
                // Create new EventOrganization and add it to Event Organizations
                var newOrg = new EventOrganization
                {
                    Name = orgName,
                    NameAr = orgName, // Use same name for Arabic if not provided
                    IsMain = false, // New organizations are not main by default
                    IsActive = true,
                    CreatedBy = "Public",
                    CreatedOn = DateTime.UtcNow
                };

                var orgEntity = await _unitOfWork.EventOrganizations.AddAsync(newOrg);
                await _unitOfWork.CompleteAsync();
                eventOrganizationId = ((EventOrganization)orgEntity).Id;
                _logger.LogInformation($"Created new EventOrganization with ID: {eventOrganizationId}, Name: {orgName}");
            }
            else
            {
                eventOrganizationId = existingOrg.Id;
                _logger.LogInformation($"Using existing EventOrganization with ID: {eventOrganizationId}, Name: {existingOrg.Name}");
            }
        }

        var registration = new EventRegistration
        {
            Name = dto.Name,
            NameAr = dto.NameAr,
            Phone = dto.Phone,
            Email = dto.Email,
            JobTitle = dto.JobTitle,
            Barcode = barcode,
            Status = EventRegistrationStatus.Draft, // Set to Draft - will be approved later
            EventId = dto.EventId,
            EventOrganizationId = eventOrganizationId,
            CreatedBy = "Public",
            UpdatedBy = "System",
            UpdatedAt = DateTime.UtcNow
        };

        var entity = await _unitOfWork.EventRegistrations.AddAsync(registration);
        await _unitOfWork.CompleteAsync();

        var registrationId = ((EventRegistration)entity).Id;

        // Reload registration with related entities for email sending (using tracked entity for updates)
        var result = await _context.EventRegistrations
            .Include(r => r.Event)
                .ThenInclude(e => e.Location)
            .Include(r => r.EventOrganization)
            .FirstOrDefaultAsync(x => x.Id == registrationId && !x.IsDeleted);

        if (result != null)
        {
            // Prepare event details for email
            var eventName = result.Event?.Name ?? "Event";
            var eventNameAr = result.Event?.NameAr;
            var eventPoster = result.Event?.Poster;
            var eventCode = result.Event?.Code;

            // Send "registration successful" email immediately (synchronously)
            _logger.LogInformation($"Sending registration successful email. Email: {result.Email}, Name: {result.Name}");
            try
            {
                var emailSent = await _emailService.SendEventRegistrationSuccessfulAsync(
                    result.Email,
                    result.Name,
                    eventName,
                    eventNameAr,
                    eventCode,
                    eventPoster
                );

                // Update email status in database (result is already tracked)
                if (emailSent)
                {
                    result.RegistrationSuccessfulEmailSent = true;
                    result.RegistrationSuccessfulEmailSentAt = DateTime.UtcNow;
                    // Keep old flag for backward compatibility
                    result.EmailSent = true;
                    result.EmailSentAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Registration successful email sent successfully to {result.Email}");
                }
                else
                {
                    _logger.LogWarning($"Failed to send registration successful email to {result.Email} - email service returned false");
                }
            }
            catch (Exception ex)
            {
                // Log error but don't fail the registration
                _logger.LogError(ex, $"Error sending registration successful email to {result.Email}. Error: {ex.Message}");
            }
        }

        // Use the tracked entity for response (already loaded with related entities)
        var responseResult = result;

        var responseMessage = "Registration successful. We will review your application and send you a confirmation email with your badge as soon as possible.";

        return CreatedAtAction(nameof(GetById), new { id = ((EventRegistration)entity).Id }, new BaseResponse<EventRegistrationDto>
        {
            StatusCode = 201,
            Message = responseMessage,
            Result = MapToDto(responseResult ?? result)
        });
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] int? eventId = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var skip = (page - 1) * pageSize;

        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? (search ?? "").ToLower().Trim() : "";

        Expression<Func<EventRegistration, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)) ||
             x.Email.ToLower().Contains(searchLower) ||
             (x.Phone != null && x.Phone.Contains(searchLower)) ||
             (x.Barcode != null && x.Barcode.Contains(searchLower))) &&
            (!eventId.HasValue || x.EventId == eventId.Value);

        Expression<Func<EventRegistration, object>> orderBy = x => x.CreatedOn;

        var data = await _unitOfWork.EventRegistrations.GetAllAsync(
            pageSize,
            skip,
            filter,
            orderBy,
            "DESC",
            new[] { "Event", "EventOrganization", "Attendees" }
        );

        var total = await _unitOfWork.EventRegistrations.CountAsync(filter);

        var dtos = data.Select(r => MapToDto(r)).ToList();

        return Ok(new BaseResponse<List<EventRegistrationDto>>
        {
            StatusCode = 200,
            Message = "Registrations retrieved successfully.",
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
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event", "EventOrganization", "Attendees" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<EventRegistrationDto>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = null
            });
        }

        var dto = MapToDto(registration);
        return Ok(new BaseResponse<EventRegistrationDto>
        {
            StatusCode = 200,
            Message = "Registration retrieved successfully.",
            Result = dto
        });
    }

    [HttpPost("{id}/approve")]
    [Authorize]
    public async Task<IActionResult> Approve(int id)
    {
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event", "EventOrganization", "Event.Location" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = false
            });
        }

        if (registration.Status == EventRegistrationStatus.Approved)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Registration is already approved.",
                Result = false
            });
        }

        // Update status to Approved
        registration.Status = EventRegistrationStatus.Approved;
        registration.UpdatedAt = DateTime.UtcNow;
        registration.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        var updatedRegistration = await _unitOfWork.EventRegistrations.UpdateAsync(registration);
        await _unitOfWork.CompleteAsync();
        

        // Generate badge image
        var badgeBytes = await GenerateBadgeImage(registration);

        // Send confirmation email with badge attachment
        var eventName = registration.Event?.Name ?? "Event";
        var eventNameAr = registration.Event?.NameAr;
        var eventDate = registration.Event?.Date;
        var eventLocation = registration.Event?.Location?.Name ?? "";
        var eventLocationAr = registration.Event?.Location?.NameAr ?? "";
        var eventPoster = registration.Event?.Poster;

        // Generate share link (can be customized based on requirements)
        var shareLink = !string.IsNullOrWhiteSpace(registration.Event?.Code) 
            ? $"https://share.google/{registration.Event.Code}{registration.Barcode}" 
            : null;

        var emailSent = await _emailService.SendEventRegistrationConfirmationAsync(
            registration.Email,
            registration.Name,
            eventName,
            eventNameAr,
            eventDate,
            eventLocation,
            eventLocationAr,
            registration.Barcode,
            badgeBytes,
            shareLink,
            registration.Event?.Code,
            eventPoster
        );

        // Update email status
        if (emailSent)
        {
            registration.ConfirmationEmailSent = true;
            registration.ConfirmationEmailSentAt = DateTime.UtcNow;
            // Keep old flag for backward compatibility
            registration.EmailSent = true;
            registration.EmailSentAt = DateTime.UtcNow;
            await _unitOfWork.EventRegistrations.UpdateAsync(registration);
            await _unitOfWork.CompleteAsync();
        }

        // Reload to get updated email status
        var finalRegistration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event", "EventOrganization" }
        );

        return Ok(new BaseResponse<EventRegistrationDto>
        {
            StatusCode = 200,
            Message = emailSent 
                ? "Registration approved and confirmation email sent successfully."
                : "Registration approved but email sending failed.",
            Result = MapToDto(finalRegistration)
        });
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = false
            });
        }

        // Soft delete
        registration.IsDeleted = true;
        registration.UpdatedAt = DateTime.UtcNow;
        registration.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        await _unitOfWork.EventRegistrations.UpdateAsync(registration);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Registration deleted successfully.",
            Result = true
        });
    }

    [HttpPost("{id}/resend-email")]
    [Authorize]
    public async Task<IActionResult> ResendEmail(int id)
    {
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event", "EventOrganization", "Event.Location" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = false
            });
        }

        if (registration.Status != EventRegistrationStatus.Approved)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Email can only be sent for approved registrations.",
                Result = false
            });
        }

        // Generate badge image
        var badgeBytes = await GenerateBadgeImage(registration);

        // Prepare event details for email
        var eventName = registration.Event?.Name ?? "Event";
        var eventNameAr = registration.Event?.NameAr;
        var eventDate = registration.Event?.Date;
        var eventLocation = registration.Event?.Location?.Name ?? "";
        var eventLocationAr = registration.Event?.Location?.NameAr ?? "";
        var eventPoster = registration.Event?.Poster;
        var eventCode = registration.Event?.Code;

        // Generate event URL
        var eventUrl = !string.IsNullOrWhiteSpace(eventCode)
            ? $"https://otc.moo.gov.kw/events/{eventCode}"
            : "https://share.google/RrKfGkA4qcxQ2VIQA"; // Hardcoded fallback

        // Send confirmation email with badge attachment
        var emailSent = await _emailService.SendEventRegistrationConfirmationAsync(
            registration.Email,
            registration.Name,
            eventName,
            eventNameAr,
            eventDate,
            eventLocation,
            eventLocationAr,
            registration.Barcode,
            badgeBytes,
            eventUrl,
            eventCode,
            eventPoster
        );

        // Update email status
        if (emailSent)
        {
            registration.ConfirmationEmailSent = true;
            registration.ConfirmationEmailSentAt = DateTime.UtcNow;
            // Keep old flag for backward compatibility
            registration.EmailSent = true;
            registration.EmailSentAt = DateTime.UtcNow;
            registration.UpdatedAt = DateTime.UtcNow;
            registration.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            await _unitOfWork.EventRegistrations.UpdateAsync(registration);
            await _unitOfWork.CompleteAsync();
        }

        // Reload to get updated email status
        var updatedRegistration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event", "EventOrganization" }
        );

        return Ok(new BaseResponse<EventRegistrationDto>
        {
            StatusCode = 200,
            Message = emailSent 
                ? "Confirmation email resent successfully."
                : "Failed to resend confirmation email.",
            Result = MapToDto(updatedRegistration)
        });
    }

    [HttpPost("{id}/send-final-approval")]
    [Authorize]
    public async Task<IActionResult> SendFinalApproval(int id)
    {
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event", "EventOrganization", "Event.Location" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = false
            });
        }

        if (registration.Status != EventRegistrationStatus.Approved)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Final approval email can only be sent for approved registrations.",
                Result = false
            });
        }

        // Generate badge image
        var badgeBytes = await GenerateBadgeImage(registration);

        // Load agenda PDF if available
        byte[]? agendaBytes = null;
        string? agendaFileName = null;
        
        if (registration.Event != null && !string.IsNullOrEmpty(registration.Event.Agenda))
        {
            try
            {
                string agendaPath = registration.Event.Agenda;
                if (agendaPath.StartsWith("/"))
                {
                    agendaPath = agendaPath.Substring(1);
                }

                var fullPath = System.IO.Path.Combine(_env.WebRootPath ?? System.IO.Path.Combine(_env.ContentRootPath, "wwwroot"), agendaPath);
                
                if (System.IO.File.Exists(fullPath))
                {
                    agendaBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                    agendaFileName = System.IO.Path.GetFileName(fullPath);
                    _logger.LogInformation($"Agenda PDF loaded: {agendaFileName}, Size: {agendaBytes.Length} bytes");
                }
                else
                {
                    _logger.LogWarning($"Agenda PDF not found at: {fullPath}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error loading agenda PDF for registration {id}");
            }
        }

        // Prepare event details for email
        var eventName = registration.Event?.Name ?? "Event";
        var eventNameAr = registration.Event?.NameAr;
        var eventDate = registration.Event?.Date;
        var eventLocation = registration.Event?.Location?.Name ?? "";
        var eventLocationAr = registration.Event?.Location?.NameAr ?? "";
        var eventPoster = registration.Event?.Poster;
        var eventCode = registration.Event?.Code;

        // Generate event URL
        var eventUrl = !string.IsNullOrWhiteSpace(eventCode)
            ? $"https://otc.moo.gov.kw/events/{eventCode}"
            : "https://otc.moo.gov.kw/events";

        // Send final approval email with badge and agenda
        var emailSent = await _emailService.SendEventFinalApprovalAsync(
            registration.Email,
            registration.Name,
            eventName,
            eventNameAr,
            eventDate,
            eventLocation,
            eventLocationAr,
            registration.Barcode,
            badgeBytes,
            agendaBytes,
            agendaFileName,
            registration.SeatNumber,
            null, // shareLink
            eventCode,
            eventPoster
        );

        // Update email status
        if (emailSent)
        {
            registration.FinalApprovalEmailSent = true;
            registration.FinalApprovalEmailSentAt = DateTime.UtcNow;
            // Keep old flag for backward compatibility
            registration.EmailSent = true;
            registration.EmailSentAt = DateTime.UtcNow;
            registration.UpdatedAt = DateTime.UtcNow;
            registration.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
            await _unitOfWork.EventRegistrations.UpdateAsync(registration);
            await _unitOfWork.CompleteAsync();
        }

        // Reload to get updated email status
        var updatedRegistration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event", "EventOrganization" }
        );

        return Ok(new BaseResponse<EventRegistrationDto>
        {
            StatusCode = 200,
            Message = emailSent 
                ? "Final approval email sent successfully with badge and agenda."
                : "Failed to send final approval email.",
            Result = MapToDto(updatedRegistration)
        });
    }

    [HttpPut("{id}/seat-number")]
    [Authorize]
    public async Task<IActionResult> UpdateSeatNumber(int id, [FromBody] UpdateSeatNumberDto request)
    {
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<EventRegistrationDto>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = null
            });
        }

        // Check for duplicate seat number if a seat number is being assigned
        if (!string.IsNullOrWhiteSpace(request.SeatNumber))
        {
            var duplicateRegistration = await _unitOfWork.EventRegistrations.FindAsync(
                x => x.EventId == registration.EventId 
                    && x.Id != id 
                    && !x.IsDeleted 
                    && x.SeatNumber != null 
                    && x.SeatNumber.Trim().ToLower() == request.SeatNumber.Trim().ToLower()
            );

            if (duplicateRegistration != null)
            {
                // Load the EventOrganization if it exists
                string organizationName = null;
                if (duplicateRegistration.EventOrganizationId.HasValue)
                {
                    var eventOrg = await _context.EventOrganizations
                        .FirstOrDefaultAsync(eo => eo.Id == duplicateRegistration.EventOrganizationId.Value);
                    organizationName = eventOrg?.Name;
                }
                
                return BadRequest(new BaseResponse<object>
                {
                    StatusCode = 400,
                    Message = $"Seat number '{request.SeatNumber}' is already assigned to another attendee.",
                    Result = new
                    {
                        duplicateAttendeeName = duplicateRegistration.Name,
                        duplicateAttendeeNameAr = duplicateRegistration.NameAr,
                        duplicateAttendeeEmail = duplicateRegistration.Email,
                        duplicateAttendeeOrganization = organizationName,
                        seatNumber = request.SeatNumber
                    }
                });
            }
        }

        registration.SeatNumber = request.SeatNumber;
        registration.UpdatedAt = DateTime.UtcNow;
        registration.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";

        await _unitOfWork.EventRegistrations.UpdateAsync(registration);
        await _unitOfWork.CompleteAsync();

        // Reload to get updated data
        var updatedRegistration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event", "EventOrganization" }
        );

        return Ok(new BaseResponse<EventRegistrationDto>
        {
            StatusCode = 200,
            Message = "Seat number updated successfully.",
            Result = MapToDto(updatedRegistration)
        });
    }

    [HttpPost("{id}/reject")]
    [Authorize]
    public async Task<IActionResult> Reject(int id)
    {
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = false
            });
        }

        if (registration.Status == EventRegistrationStatus.Rejected)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Registration is already rejected.",
                Result = false
            });
        }

        // Update status to Rejected
        registration.Status = EventRegistrationStatus.Rejected;
        registration.UpdatedAt = DateTime.UtcNow;
        registration.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
        
        var updatedRegistration = await _unitOfWork.EventRegistrations.UpdateAsync(registration);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<EventRegistrationDto>
        {
            StatusCode = 200,
            Message = "Registration rejected successfully.",
            Result = MapToDto(updatedRegistration)
        });
    }


    private string GenerateBarcode(string eventCode)
    {
        // Generate a unique barcode in format: EventCode + 5 random digits
        // Example: MASSAR78828
        if (string.IsNullOrWhiteSpace(eventCode))
        {
            eventCode = "EVENT"; // Fallback if event code is empty
        }
        
        var random = new Random();
        var randomDigits = random.Next(10000, 99999); // 5-digit number
        var barcode = $"{eventCode.ToUpper()}{randomDigits}";
        
        // Ensure uniqueness by checking if barcode already exists
        var exists = _context.EventRegistrations.Any(er => er.Barcode == barcode && !er.IsDeleted);
        int attempts = 0;
        while (exists && attempts < 10)
        {
            randomDigits = random.Next(10000, 99999);
            barcode = $"{eventCode.ToUpper()}{randomDigits}";
            exists = _context.EventRegistrations.Any(er => er.Barcode == barcode && !er.IsDeleted);
            attempts++;
        }
        
        return barcode;
    }

    private EventRegistrationDto MapToDto(EventRegistration registration)
    {
        return new EventRegistrationDto
        {
            Id = registration.Id,
            Name = registration.Name,
            NameAr = registration.NameAr,
            Phone = registration.Phone,
            Email = registration.Email,
            JobTitle = registration.JobTitle,
            Barcode = registration.Barcode,
            SeatNumber = registration.SeatNumber,
            Status = registration.Status,
            EmailSent = registration.EmailSent,
            EmailSentAt = registration.EmailSentAt,
            RegistrationSuccessfulEmailSent = registration.RegistrationSuccessfulEmailSent,
            RegistrationSuccessfulEmailSentAt = registration.RegistrationSuccessfulEmailSentAt,
            ConfirmationEmailSent = registration.ConfirmationEmailSent,
            ConfirmationEmailSentAt = registration.ConfirmationEmailSentAt,
            FinalApprovalEmailSent = registration.FinalApprovalEmailSent,
            FinalApprovalEmailSentAt = registration.FinalApprovalEmailSentAt,
            EventId = registration.EventId,
            Event = registration.Event != null ? new EventDto
            {
                Id = registration.Event.Id,
                Name = registration.Event.Name,
                NameAr = registration.Event.NameAr,
                Code = registration.Event.Code
            } : null,
            EventOrganizationId = registration.EventOrganizationId,
            EventOrganization = registration.EventOrganization != null ? new EventOrganizationDto
            {
                Id = registration.EventOrganization.Id,
                Name = registration.EventOrganization.Name,
                NameAr = registration.EventOrganization.NameAr,
                IsMain = registration.EventOrganization.IsMain
            } : null,
            Attendees = registration.Attendees?.Select(a => new EventAttendeeDto
            {
                Id = a.Id,
                EventRegistrationId = a.EventRegistrationId,
                CheckInDateTime = a.CheckInDateTime,
                CheckOutDateTime = a.CheckOutDateTime
            }).ToList() ?? new List<EventAttendeeDto>(),
            IsActive = registration.IsActive,
            CreatedAt = registration.CreatedOn,
            CreatedBy = registration.CreatedBy,
            UpdatedAt = registration.UpdatedAt,
            UpdatedBy = registration.UpdatedBy
        };
    }

    [HttpGet("{id}/badge")]
    [Authorize]
    public async Task<IActionResult> GetBadge(int id)
    {
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<string>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = null
            });
        }

        if (string.IsNullOrEmpty(registration.Barcode))
        {
            return BadRequest(new BaseResponse<string>
            {
                StatusCode = 400,
                Message = "Registration does not have a barcode.",
                Result = null
            });
        }

        try
        {
            var badgeImage = await GenerateBadgeImage(registration);
            return File(badgeImage, "image/png", $"badge-{registration.Barcode}-{registration.Name.Replace(" ", "-")}.png");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new BaseResponse<string>
            {
                StatusCode = 500,
                Message = $"Error generating badge: {ex.Message}",
                Result = null
            });
        }
    }

    [HttpGet("export")]
    [Authorize]
    public async Task<IActionResult> ExportToExcel(
        [FromQuery] int? eventId = null,
        [FromQuery] string? search = null,
        [FromQuery] EventRegistrationStatus? status = null)
    {
        try
        {
            // Build query
            Expression<Func<EventRegistration, bool>> predicate = x => !x.IsDeleted;

            if (eventId.HasValue)
            {
                var eventIdValue = eventId.Value;
                predicate = x => !x.IsDeleted && x.EventId == eventIdValue;
            }

            // Get all registrations matching the criteria
            var registrations = (await _unitOfWork.EventRegistrations.GetAllAsync(
                predicate,
                new[] { "Event", "EventOrganization", "Attendees" }
            )).ToList();

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                registrations = registrations.Where(r =>
                    (r.Name != null && r.Name.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                    (r.NameAr != null && r.NameAr.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                    (r.Email != null && r.Email.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                    (r.Phone != null && r.Phone.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                    (r.Barcode != null && r.Barcode.Contains(search, StringComparison.OrdinalIgnoreCase)) ||
                    (r.EventOrganization != null && r.EventOrganization.Name != null && r.EventOrganization.Name.Contains(search, StringComparison.OrdinalIgnoreCase))
                ).ToList();
            }

            // Apply status filter
            if (status.HasValue)
            {
                registrations = registrations.Where(r => r.Status == status.Value).ToList();
            }

            // Build CSV content
            var csvRows = new List<string>();
            
            // Add headers
            var headers = new[]
            {
                "Organization",
                "Name",
                "Name (Arabic)",
                "Phone",
                "Email",
                "Barcode",
                "Status",
                "Email Sent",
                "Email Sent At",
                "Check-In Date",
                "Check-Out Date"
            };
            csvRows.Add(string.Join(",", headers.Select(h => $"\"{h}\"")));

            // Add data rows
            foreach (var registration in registrations)
            {
                var latestCheckIn = registration.Attendees?
                    .Where(a => a.CheckInDateTime.HasValue)
                    .OrderByDescending(a => a.CheckInDateTime)
                    .FirstOrDefault();

                var statusText = registration.Status switch
                {
                    EventRegistrationStatus.Draft => "Draft",
                    EventRegistrationStatus.Approved => "Approved",
                    EventRegistrationStatus.Rejected => "Rejected",
                    _ => "Unknown"
                };

                var row = new[]
                {
                    registration.EventOrganization?.Name ?? "No Organization",
                    registration.Name ?? "",
                    registration.NameAr ?? "",
                    registration.Phone ?? "",
                    registration.Email ?? "",
                    registration.Barcode ?? "",
                    statusText,
                    registration.EmailSent ? "Yes" : "No",
                    registration.EmailSentAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "",
                    latestCheckIn?.CheckInDateTime?.ToString("yyyy-MM-dd HH:mm:ss") ?? "",
                    latestCheckIn?.CheckOutDateTime?.ToString("yyyy-MM-dd HH:mm:ss") ?? ""
                };

                csvRows.Add(string.Join(",", row.Select(cell =>
                {
                    var cellStr = cell ?? "";
                    if (cellStr.Contains(",") || cellStr.Contains("\n") || cellStr.Contains("\""))
                    {
                        return $"\"{cellStr.Replace("\"", "\"\"")}\"";
                    }
                    return $"\"{cellStr}\"";
                })));
            }

            // Convert to bytes with UTF-8 BOM
            var csvContent = string.Join("\n", csvRows);
            var bom = Encoding.UTF8.GetPreamble();
            var csvBytes = Encoding.UTF8.GetBytes(csvContent);
            var result = new byte[bom.Length + csvBytes.Length];
            Buffer.BlockCopy(bom, 0, result, 0, bom.Length);
            Buffer.BlockCopy(csvBytes, 0, result, bom.Length, csvBytes.Length);

            // Determine filename
            var eventName = registrations.FirstOrDefault()?.Event?.Name ?? "Event";
            var statusSuffix = status.HasValue
                ? (status.Value == EventRegistrationStatus.Approved ? "Approved" : "Rejected")
                : "All";
            var dateStr = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var filename = $"Event_Registrations_{statusSuffix}_{eventName.Replace(" ", "_")}_{dateStr}.csv";

            return File(result, "text/csv; charset=utf-8", filename);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new BaseResponse<bool>
            {
                StatusCode = 500,
                Message = $"Error exporting registrations: {ex.Message}",
                Result = false
            });
        }
    }

    [HttpGet("badge/{barcode}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetBadgeByBarcode(string barcode)
    {
        var registration = await _unitOfWork.EventRegistrations.FindAsync(
            x => x.Barcode == barcode && !x.IsDeleted,
            new[] { "Event" }
        );

        if (registration == null)
        {
            return NotFound(new BaseResponse<string>
            {
                StatusCode = 404,
                Message = "Registration not found.",
                Result = null
            });
        }

        try
        {
            var badgeImage = await GenerateBadgeImage(registration);
            return File(badgeImage, "image/png", $"badge-{registration.Barcode}-{registration.Name.Replace(" ", "-")}.png");
        }
        catch (Exception ex)
        {
            return StatusCode(500, new BaseResponse<string>
            {
                StatusCode = 500,
                Message = $"Error generating badge: {ex.Message}",
                Result = null
            });
        }
    }

    private async Task<byte[]> GenerateBadgeImage(EventRegistration registration)
    {
        Image<Rgba32> badgeImage;
        int badgeWidth;
        int badgeHeight;

        // Load badge template if available
        if (registration.Event != null && !string.IsNullOrEmpty(registration.Event.Badge))
        {
            var badgePath = registration.Event.Badge;
            if (badgePath.StartsWith("/"))
            {
                badgePath = badgePath.Substring(1); // Remove leading slash
            }

            var fullPath = System.IO.Path.Combine(_env.WebRootPath ?? System.IO.Path.Combine(_env.ContentRootPath, "wwwroot"), badgePath);
            
            if (System.IO.File.Exists(fullPath))
            {
                badgeImage = await Image.LoadAsync<Rgba32>(fullPath);
                badgeWidth = badgeImage.Width;
                badgeHeight = badgeImage.Height;
            }
            else
            {
                // Fallback: create white background
                badgeWidth = 800;
                badgeHeight = 600;
                badgeImage = new Image<Rgba32>(badgeWidth, badgeHeight, SixLabors.ImageSharp.Color.White);
            }
        }
        else
        {
            // No badge template, create white background
            badgeWidth = 800;
            badgeHeight = 600;
            badgeImage = new Image<Rgba32>(badgeWidth, badgeHeight, SixLabors.ImageSharp.Color.White);
        }

        // Generate QR Code
        using var qrGenerator = new QRCodeGenerator();
        var qrData = qrGenerator.CreateQrCode(registration.Barcode, QRCodeGenerator.ECCLevel.M);
        using var qrCode = new PngByteQRCode(qrData);
        var qrCodeBytes = qrCode.GetGraphic(20);
        
        using var qrCodeImage = await Image.LoadAsync<Rgba32>(new MemoryStream(qrCodeBytes));
        
        // Resize QR code to 900px width
        var qrSize = 800;
        qrCodeImage.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new SixLabors.ImageSharp.Size(qrSize, qrSize),
            Mode = ResizeMode.Stretch
        }));

        // Calculate positions (centered, moved up more)
        var qrX = (badgeWidth - qrSize) / 2;
        var qrY = (badgeHeight / 2) - 600; // Moved up more for 900px QR code

        // Draw QR code on badge
        badgeImage.Mutate(ctx =>
        {
            // Draw white background for QR code
            var qrPadding = 5; // Increased padding for larger QR code
            ctx.Fill(SixLabors.ImageSharp.Color.White, new RectangleF(qrX - qrPadding, qrY - qrPadding, qrSize + (qrPadding * 2), qrSize + (qrPadding * 2)));
            
            // Draw QR code
            ctx.DrawImage(qrCodeImage, new SixLabors.ImageSharp.Point(qrX, qrY), 1f);

            // Draw barcode text below QR code
            var barcodeTextY = qrY + qrSize + 2; // Decreased space between QR and barcode value (closer to QR)
            
            // Try to use Poppins font, fallback to Arial if not available
            Font fontForBarcode;
            Font fontForName;
            
            try
            {
                // Try to load Poppins SemiBold (600 weight), fallback to Bold if not available
                try
                {
                    fontForBarcode = SystemFonts.CreateFont("Poppins", 70, FontStyle.Bold);
                }
                catch
                {
                    fontForBarcode = SystemFonts.CreateFont("Poppins", 70, FontStyle.Regular);
                }
                fontForName = SystemFonts.CreateFont("Poppins", 100, FontStyle.Bold);
            }
            catch
            {
                // Fallback to Arial if Poppins is not available
                fontForBarcode = SystemFonts.CreateFont("Arial", 70, FontStyle.Bold);
                fontForName = SystemFonts.CreateFont("Arial", 100, FontStyle.Bold);
            }
            
            var textOptions = new RichTextOptions(fontForBarcode)
            {
                Origin = new SixLabors.ImageSharp.PointF(badgeWidth / 2f, barcodeTextY),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Top
            };
            ctx.DrawText(textOptions, registration.Barcode, SixLabors.ImageSharp.Color.DarkGray);

            // Draw name below barcode (with increased spacing)
            var nameY = barcodeTextY + 90; // Increased spacing between barcode value and name (was 50, now 80)
            var nameTextOptions = new RichTextOptions(fontForName)
            {
                Origin = new SixLabors.ImageSharp.PointF(badgeWidth / 2f, nameY),
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Top
            };
            ctx.DrawText(nameTextOptions, registration.Name, SixLabors.ImageSharp.Color.Black);
        });

        // Convert to byte array
        using var ms = new MemoryStream();
        await badgeImage.SaveAsync(ms, new PngEncoder());
        return ms.ToArray();
    }
}

