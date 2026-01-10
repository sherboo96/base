using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;
using AutoMapper;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EventSessionsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly IWebHostEnvironment _environment;

    public EventSessionsController(IUnitOfWork unitOfWork, IMapper mapper, IWebHostEnvironment environment)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _environment = environment;
    }

    [HttpGet]
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

        Expression<Func<EventSession, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Title.ToLower().Contains(searchLower) ||
             (x.TitleAr != null && x.TitleAr.ToLower().Contains(searchLower)) ||
             (x.Description != null && x.Description.ToLower().Contains(searchLower))) &&
            (!eventId.HasValue || x.EventId == eventId.Value);

        Expression<Func<EventSession, object>> orderBy = x => x.DateTime;

        var data = await _unitOfWork.EventSessions.GetAllAsync(
            pageSize,
            skip,
            filter,
            orderBy,
            "DESC",
            new[] { "Event" }
        );

        var total = await _unitOfWork.EventSessions.CountAsync(filter);

        var dtos = data.Select(s => MapToDto(s)).ToList();

        return Ok(new BaseResponse<List<EventSessionDto>>
        {
            StatusCode = 200,
            Message = "Event sessions retrieved successfully.",
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
    public async Task<IActionResult> GetById(int id)
    {
        var session = await _unitOfWork.EventSessions.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event" }
        );

        if (session == null)
        {
            return NotFound(new BaseResponse<EventSessionDto>
            {
                StatusCode = 404,
                Message = "Event session not found.",
                Result = null
            });
        }

        return Ok(new BaseResponse<EventSessionDto>
        {
            StatusCode = 200,
            Message = "Event session retrieved successfully.",
            Result = MapToDto(session)
        });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] EventSessionDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        // Validate event exists
        var eventEntity = await _unitOfWork.Events.FindAsync(x => x.Id == dto.EventId && !x.IsDeleted);
        if (eventEntity == null)
        {
            return BadRequest(new BaseResponse<EventSessionDto>
            {
                StatusCode = 400,
                Message = "Event not found.",
                Result = null
            });
        }

        var session = _mapper.Map<EventSession>(dto);
        session.CreatedBy = currentUser;
        session.CreatedOn = DateTime.Now;
        session.IsActive = true;

        var created = await _unitOfWork.EventSessions.AddAsync(session);
        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.EventSessions.FindAsync(
            x => x.Id == created.Id && !x.IsDeleted,
            new[] { "Event" }
        );

        return CreatedAtAction(nameof(GetById), new { id = created.Id }, new BaseResponse<EventSessionDto>
        {
            StatusCode = 201,
            Message = "Event session created successfully.",
            Result = MapToDto(result)
        });
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] EventSessionDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        var existing = await _unitOfWork.EventSessions.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event" }
        );

        if (existing == null)
        {
            return NotFound(new BaseResponse<EventSessionDto>
            {
                StatusCode = 404,
                Message = "Event session not found.",
                Result = null
            });
        }

        // Validate event exists if changed
        if (dto.EventId != existing.EventId)
        {
            var eventEntity = await _unitOfWork.Events.FindAsync(x => x.Id == dto.EventId && !x.IsDeleted);
            if (eventEntity == null)
            {
                return BadRequest(new BaseResponse<EventSessionDto>
                {
                    StatusCode = 400,
                    Message = "Event not found.",
                    Result = null
                });
            }
        }

        existing.Title = dto.Title;
        existing.TitleAr = dto.TitleAr;
        existing.Description = dto.Description;
        existing.DescriptionAr = dto.DescriptionAr;
        existing.AvailableSeats = dto.AvailableSeats;
        existing.DateTime = dto.DateTime;
        existing.Banner = dto.Banner;
        existing.EventId = dto.EventId;
        existing.IsActive = dto.IsActive;
        existing.UpdatedAt = DateTime.Now;
        existing.UpdatedBy = currentUser;

        await _unitOfWork.EventSessions.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.EventSessions.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Event" }
        );

        return Ok(new BaseResponse<EventSessionDto>
        {
            StatusCode = 200,
            Message = "Event session updated successfully.",
            Result = MapToDto(result)
        });
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.EventSessions.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Event session not found.",
                Result = false
            });
        }

        await _unitOfWork.EventSessions.DeleteAsync(id);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Event session deleted successfully.",
            Result = true
        });
    }

    [HttpPost("{id}/upload-banner")]
    [Authorize]
    public async Task<IActionResult> UploadBanner(int id, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "No file uploaded.", Result = false });
        }

        var existing = await _unitOfWork.EventSessions.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Event session not found.", Result = false });
        }

        // Validate file type (images only)
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp" };
        var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(fileExtension))
        {
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Invalid file type. Only image files are allowed.", Result = false });
        }

        // Validate file size (max 5MB)
        if (file.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "File size exceeds the maximum allowed size of 5MB.", Result = false });
        }

        // Create uploads directory if it doesn't exist
        var uploadsDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"), "uploads", "event-sessions", "banners");
        if (!Directory.Exists(uploadsDir))
        {
            Directory.CreateDirectory(uploadsDir);
        }

        // Generate unique filename
        var fileName = $"{id}_{Guid.NewGuid()}{fileExtension}";
        var filePath = Path.Combine(uploadsDir, fileName);

        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Delete old banner if exists
        if (!string.IsNullOrEmpty(existing.Banner))
        {
            var oldBannerPath = Path.Combine(_environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"), existing.Banner.TrimStart('/'));
            if (System.IO.File.Exists(oldBannerPath))
            {
                try
                {
                    System.IO.File.Delete(oldBannerPath);
                }
                catch { /* Ignore deletion errors */ }
            }
        }

        // Update session with new banner path (relative to wwwroot)
        existing.Banner = $"/uploads/event-sessions/banners/{fileName}";
        existing.UpdatedAt = DateTime.Now;
        existing.UpdatedBy = User.FindFirst(ClaimTypes.Name)?.Value ?? User.Identity?.Name ?? "System";
        await _unitOfWork.EventSessions.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<object>
        {
            StatusCode = 200,
            Message = "Banner uploaded successfully.",
            Result = new { bannerPath = existing.Banner }
        });
    }

    private EventSessionDto MapToDto(EventSession session)
    {
        return new EventSessionDto
        {
            Id = session.Id,
            Title = session.Title,
            TitleAr = session.TitleAr,
            Description = session.Description,
            DescriptionAr = session.DescriptionAr,
            AvailableSeats = session.AvailableSeats,
            DateTime = session.DateTime,
            Banner = session.Banner,
            EventId = session.EventId,
            Event = session.Event != null ? new EventDto
            {
                Id = session.Event.Id,
                Name = session.Event.Name,
                NameAr = session.Event.NameAr,
                Code = session.Event.Code
            } : null,
            IsActive = session.IsActive,
            CreatedAt = session.CreatedOn,
            CreatedBy = session.CreatedBy,
            UpdatedAt = session.UpdatedAt,
            UpdatedBy = session.UpdatedBy
        };
    }
}

