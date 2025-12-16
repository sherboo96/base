using System.Linq.Expressions;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EventSpeakersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public EventSpeakersController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
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

        Expression<Func<EventSpeaker, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)) ||
             (x.From != null && x.From.ToLower().Contains(searchLower))) &&
            (!eventId.HasValue || x.EventId == eventId.Value);

        Expression<Func<EventSpeaker, object>> orderBy = x => x.CreatedOn;

        var data = await _unitOfWork.EventSpeakers.GetAllAsync(
            pageSize,
            skip,
            filter,
            orderBy,
            "DESC"
        );

        var total = await _unitOfWork.EventSpeakers.CountAsync(filter);

        var dtos = data.Select(s => MapToDto(s)).ToList();

        return Ok(new BaseResponse<List<EventSpeakerDto>>
        {
            StatusCode = 200,
            Message = "Speakers retrieved successfully.",
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
        var speaker = await _unitOfWork.EventSpeakers.FindAsync(x => x.Id == id && !x.IsDeleted);

        if (speaker == null)
        {
            return NotFound(new BaseResponse<EventSpeakerDto>
            {
                StatusCode = 404,
                Message = "Speaker not found.",
                Result = null
            });
        }

        var dto = MapToDto(speaker);
        return Ok(new BaseResponse<EventSpeakerDto>
        {
            StatusCode = 200,
            Message = "Speaker retrieved successfully.",
            Result = dto
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] EventSpeakerDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        var entity = await _unitOfWork.EventSpeakers.AddAsync(dto);
        await _unitOfWork.CompleteAsync();

        return CreatedAtAction(nameof(GetById), new { id = ((EventSpeaker)entity).Id }, new BaseResponse<EventSpeakerDto>
        {
            StatusCode = 201,
            Message = "Speaker created successfully.",
            Result = MapToDto((EventSpeaker)entity)
        });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] EventSpeakerDto dto)
    {
        var currentUser = User.FindFirst(ClaimTypes.Name)?.Value
                          ?? User.FindFirst("UserName")?.Value
                          ?? User.FindFirst("username")?.Value
                          ?? User.Identity?.Name
                          ?? "System";

        var existing = await _unitOfWork.EventSpeakers.FindAsync(x => x.Id == id && !x.IsDeleted);

        if (existing == null)
        {
            return NotFound(new BaseResponse<EventSpeakerDto>
            {
                StatusCode = 404,
                Message = "Speaker not found.",
                Result = null
            });
        }

        dto.Id = id;
        var updated = await _unitOfWork.EventSpeakers.UpdateAsync(dto);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<EventSpeakerDto>
        {
            StatusCode = 200,
            Message = "Speaker updated successfully.",
            Result = MapToDto((EventSpeaker)updated)
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.EventSpeakers.FindAsync(x => x.Id == id && !x.IsDeleted);

        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Speaker not found.",
                Result = false
            });
        }

        await _unitOfWork.EventSpeakers.DeleteAsync(id);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Speaker deleted successfully.",
            Result = true
        });
    }

    private EventSpeakerDto MapToDto(EventSpeaker speaker)
    {
        return new EventSpeakerDto
        {
            Id = speaker.Id,
            Name = speaker.Name,
            NameAr = speaker.NameAr,
            BioEn = speaker.BioEn,
            BioAr = speaker.BioAr,
            From = speaker.From,
            EventId = speaker.EventId,
            IsActive = speaker.IsActive,
            CreatedAt = speaker.CreatedOn,
            CreatedBy = speaker.CreatedBy,
            UpdatedAt = speaker.UpdatedAt,
            UpdatedBy = speaker.UpdatedBy
        };
    }
}

