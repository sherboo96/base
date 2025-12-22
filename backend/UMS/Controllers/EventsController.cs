using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;
using UMS.Data;
using AutoMapper;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EventsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ApplicationDbContext _context;
    private readonly IMapper _mapper;

    public EventsController(IUnitOfWork unitOfWork, ApplicationDbContext context, IMapper mapper)
    {
        _unitOfWork = unitOfWork;
        _context = context;
        _mapper = mapper;
    }

    // Public endpoint - no authentication required
    [AllowAnonymous]
    [HttpGet("public/{code}")]
    public async Task<IActionResult> GetByCode(string code)
    {
        var eventEntity = await _unitOfWork.Events.FindAsync(
            x => x.Code == code && x.Published && !x.IsDeleted,
            new[] { "Speakers", "Location" }
        );

        if (eventEntity == null)
        {
            return NotFound(new BaseResponse<EventDto>
            {
                StatusCode = 404,
                Message = "Event not found or not published.",
                Result = null
            });
        }

        var dto = MapToDto(eventEntity);
        return Ok(new BaseResponse<EventDto>
        {
            StatusCode = 200,
            Message = "Event retrieved successfully.",
            Result = dto
        });
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] bool? published = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 20;

        var skip = (page - 1) * pageSize;

        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? (search ?? "").ToLower().Trim() : "";

        Expression<Func<Event, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)) ||
             x.Code.ToLower().Contains(searchLower)) &&
            (!published.HasValue || x.Published == published.Value);

        Expression<Func<Event, object>> orderBy = x => x.CreatedOn;

        var data = await _unitOfWork.Events.GetAllAsync(
            pageSize,
            skip,
            filter,
            orderBy,
            "DESC",
            new[] { "Speakers", "Location" }
        );

        var total = await _unitOfWork.Events.CountAsync(filter);

        var dtos = data.Select(e => MapToDto(e)).ToList();

        return Ok(new BaseResponse<List<EventDto>>
        {
            StatusCode = 200,
            Message = "Events retrieved successfully.",
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
        var eventEntity = await _unitOfWork.Events.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Speakers" }
        );

        if (eventEntity == null)
        {
            return NotFound(new BaseResponse<EventDto>
            {
                StatusCode = 404,
                Message = "Event not found.",
                Result = null
            });
        }

        var dto = MapToDto(eventEntity);
        return Ok(new BaseResponse<EventDto>
        {
            StatusCode = 200,
            Message = "Event retrieved successfully.",
            Result = dto
        });
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create([FromBody] EventDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        // Check if code already exists
        var existingEvent = await _unitOfWork.Events.FindAsync(x => x.Code == dto.Code && !x.IsDeleted);
        if (existingEvent != null)
        {
            return BadRequest(new BaseResponse<EventDto>
            {
                StatusCode = 400,
                Message = "Event code already exists.",
                Result = null
            });
        }

        var eventEntity = new Event
        {
            Name = dto.Name,
            NameAr = dto.NameAr,
            Description = dto.Description,
            DescriptionAr = dto.DescriptionAr,
            Code = dto.Code,
            Poster = dto.Poster,
            Badge = dto.Badge,
            Agenda = dto.Agenda,
            Date = dto.Date,
            Published = dto.Published,
            LocationId = dto.LocationId,
            IsActive = dto.IsActive,
            CreatedBy = currentUser
        };

        var entity = await _unitOfWork.Events.AddAsync(eventEntity);
        await _unitOfWork.CompleteAsync();

        var createdId = ((Event)entity).Id;

        // Add speakers if provided
        if (dto.Speakers != null && dto.Speakers.Count > 0)
        {
            foreach (var speakerDto in dto.Speakers)
            {
                if (!string.IsNullOrWhiteSpace(speakerDto.Name))
                {
                    var speaker = new EventSpeaker
                    {
                        Name = speakerDto.Name,
                        NameAr = speakerDto.NameAr,
                        BioEn = speakerDto.BioEn,
                        BioAr = speakerDto.BioAr,
                        From = speakerDto.From,
                        EventId = createdId,
                        CreatedBy = currentUser
                    };
                    await _context.EventSpeakers.AddAsync(speaker);
                }
            }
        }

        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.Events.FindAsync(
            x => x.Id == createdId && !x.IsDeleted,
            new[] { "Speakers", "Location" }
        );

        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<EventDto>
        {
            StatusCode = 201,
            Message = "Event created successfully.",
            Result = MapToDto(result)
        });
    }

    [HttpPut("{id}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, [FromBody] EventDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        var existing = await _unitOfWork.Events.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Speakers", "Location" }
        );

        if (existing == null)
        {
            return NotFound(new BaseResponse<EventDto>
            {
                StatusCode = 404,
                Message = "Event not found.",
                Result = null
            });
        }

        // Check if code already exists (excluding current event)
        if (dto.Code != existing.Code)
        {
            var codeExists = await _unitOfWork.Events.FindAsync(x => x.Code == dto.Code && x.Id != id && !x.IsDeleted);
            if (codeExists != null)
            {
                return BadRequest(new BaseResponse<EventDto>
                {
                    StatusCode = 400,
                    Message = "Event code already exists.",
                    Result = null
                });
            }
        }

        existing.Name = dto.Name;
        existing.NameAr = dto.NameAr;
        existing.Description = dto.Description;
        existing.DescriptionAr = dto.DescriptionAr;
        existing.Code = dto.Code;
        existing.Poster = dto.Poster;
        existing.Badge = dto.Badge;
        existing.Agenda = dto.Agenda;
        existing.Date = dto.Date;
        existing.Published = dto.Published;
        existing.LocationId = dto.LocationId;
        existing.IsActive = dto.IsActive;
        existing.UpdatedAt = DateTime.Now;
        existing.UpdatedBy = currentUser;

        // Update speakers - delete existing and add new ones
        var existingSpeakers = existing.Speakers.ToList();
        foreach (var speaker in existingSpeakers)
        {
            await _unitOfWork.EventSpeakers.DeleteAsync(speaker.Id);
        }

        // Add new speakers
        if (dto.Speakers != null && dto.Speakers.Count > 0)
        {
            foreach (var speakerDto in dto.Speakers)
            {
                if (!string.IsNullOrWhiteSpace(speakerDto.Name))
                {
                    var speaker = new EventSpeaker
                    {
                        Name = speakerDto.Name,
                        NameAr = speakerDto.NameAr,
                        BioEn = speakerDto.BioEn,
                        BioAr = speakerDto.BioAr,
                        From = speakerDto.From,
                        EventId = id,
                        CreatedBy = currentUser
                    };
                    await _context.EventSpeakers.AddAsync(speaker);
                }
            }
        }

        await _unitOfWork.Events.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        var result = await _unitOfWork.Events.FindAsync(
            x => x.Id == id && !x.IsDeleted,
            new[] { "Speakers", "Location" }
        );

        return Ok(new BaseResponse<EventDto>
        {
            StatusCode = 200,
            Message = "Event updated successfully.",
            Result = MapToDto(result)
        });
    }

    [HttpDelete("{id}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Events.FindAsync(x => x.Id == id && !x.IsDeleted);

        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Event not found.",
                Result = false
            });
        }

        await _unitOfWork.Events.DeleteAsync(id);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Event deleted successfully.",
            Result = true
        });
    }

    private EventDto MapToDto(Event eventEntity)
    {
        return new EventDto
        {
            Id = eventEntity.Id,
            Name = eventEntity.Name,
            NameAr = eventEntity.NameAr,
            Description = eventEntity.Description,
            DescriptionAr = eventEntity.DescriptionAr,
            Code = eventEntity.Code,
            Poster = eventEntity.Poster,
            Badge = eventEntity.Badge,
            Agenda = eventEntity.Agenda,
            Date = eventEntity.Date,
            Published = eventEntity.Published,
            LocationId = eventEntity.LocationId,
            Location = eventEntity.Location != null ? _mapper.Map<LocationDto>(eventEntity.Location) : null,
            SpeakerIds = eventEntity.Speakers?.Select(s => s.Id).ToList() ?? new List<int>(),
            Speakers = eventEntity.Speakers?.Select(s => _mapper.Map<EventSpeakerDto>(s)).ToList() ?? new List<EventSpeakerDto>(),
            IsActive = eventEntity.IsActive,
            CreatedAt = eventEntity.CreatedOn,
            CreatedBy = eventEntity.CreatedBy,
            UpdatedAt = eventEntity.UpdatedAt,
            UpdatedBy = eventEntity.UpdatedBy
        };
    }
}

