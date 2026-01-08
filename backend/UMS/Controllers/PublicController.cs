using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
public class PublicController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private const string SupportInfoKey = "support_info";

    public PublicController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Get support information (public endpoint, no authentication required)
    /// </summary>
    [HttpGet("support")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSupportInfo()
    {
        var publicData = await _unitOfWork.Publics.FindAsync(p => p.Key == SupportInfoKey && p.IsActive && !p.IsDeleted);
        
        if (publicData == null || string.IsNullOrEmpty(publicData.Value))
        {
            return Ok(new BaseResponse<SupportInfoDto>
            {
                StatusCode = 200,
                Message = "Support information retrieved successfully.",
                Result = new SupportInfoDto
                {
                    Contacts = new List<SupportContactDto>()
                }
            });
        }

        try
        {
            var supportInfo = JsonSerializer.Deserialize<SupportInfoDto>(publicData.Value);
            
            // Handle backward compatibility: convert old format (Emails/PhoneNumbers) to new format (Contacts)
            if (supportInfo != null && (supportInfo.Emails != null || supportInfo.PhoneNumbers != null) && 
                (supportInfo.Contacts == null || supportInfo.Contacts.Count == 0))
            {
                supportInfo.Contacts = new List<SupportContactDto>();
                
                // Convert old format to new format
                var maxCount = Math.Max(
                    supportInfo.Emails?.Count ?? 0,
                    supportInfo.PhoneNumbers?.Count ?? 0
                );
                
                for (int i = 0; i < maxCount; i++)
                {
                    supportInfo.Contacts.Add(new SupportContactDto
                    {
                        Name = $"Contact {i + 1}",
                        Email = supportInfo.Emails?.Count > i ? supportInfo.Emails[i] : string.Empty,
                        PhoneNumber = supportInfo.PhoneNumbers?.Count > i ? supportInfo.PhoneNumbers[i] : string.Empty
                    });
                }
            }
            
            return Ok(new BaseResponse<SupportInfoDto>
            {
                StatusCode = 200,
                Message = "Support information retrieved successfully.",
                Result = supportInfo ?? new SupportInfoDto { Contacts = new List<SupportContactDto>() }
            });
        }
        catch
        {
            return Ok(new BaseResponse<SupportInfoDto>
            {
                StatusCode = 200,
                Message = "Support information retrieved successfully.",
                Result = new SupportInfoDto
                {
                    Contacts = new List<SupportContactDto>()
                }
            });
        }
    }

    /// <summary>
    /// Get all public configurations (authorized)
    /// </summary>
    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll()
    {
        var publics = await _unitOfWork.Publics.GetAllAsync(p => p.IsActive && !p.IsDeleted);
        
        var result = publics.Select(p => new PublicDto
        {
            Key = p.Key,
            Value = p.Value,
            Description = p.Description
        }).ToList();

        return Ok(new BaseResponse<IEnumerable<PublicDto>>
        {
            StatusCode = 200,
            Message = "Public configurations retrieved successfully.",
            Result = result
        });
    }

    /// <summary>
    /// Get public configuration by key (authorized)
    /// </summary>
    [HttpGet("{key}")]
    [Authorize]
    public async Task<IActionResult> GetByKey(string key)
    {
        var publicData = await _unitOfWork.Publics.FindAsync(p => p.Key == key && p.IsActive && !p.IsDeleted);
        
        if (publicData == null)
        {
            return NotFound(new BaseResponse<PublicDto>
            {
                StatusCode = 404,
                Message = "Public configuration not found.",
                Result = null
            });
        }

        var result = new PublicDto
        {
            Key = publicData.Key,
            Value = publicData.Value,
            Description = publicData.Description
        };

        return Ok(new BaseResponse<PublicDto>
        {
            StatusCode = 200,
            Message = "Public configuration retrieved successfully.",
            Result = result
        });
    }

    /// <summary>
    /// Create or update public configuration (authorized)
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateOrUpdate([FromBody] PublicDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Key))
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Key is required.",
                Result = false
            });
        }

        var existing = await _unitOfWork.Publics.FindAsync(p => p.Key == dto.Key && !p.IsDeleted);
        
        if (existing != null)
        {
            existing.Value = dto.Value ?? string.Empty;
            existing.Description = dto.Description;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = User.Identity?.Name;
            await _unitOfWork.Publics.UpdateAsync(existing);
        }
        else
        {
            var newPublic = new Public
            {
                Key = dto.Key,
                Value = dto.Value ?? string.Empty,
                Description = dto.Description,
                IsActive = true,
                CreatedOn = DateTime.UtcNow,
                CreatedBy = User.Identity?.Name
            };
            await _unitOfWork.Publics.AddAsync(newPublic);
        }
        
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Public configuration saved successfully.",
            Result = true
        });
    }

    /// <summary>
    /// Update support information (authorized)
    /// </summary>
    [HttpPost("support")]
    [Authorize]
    public async Task<IActionResult> UpdateSupportInfo([FromBody] SupportInfoDto dto)
    {
        if (dto == null)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Support information is required.",
                Result = false
            });
        }

        var jsonValue = JsonSerializer.Serialize(dto);
        var existing = await _unitOfWork.Publics.FindAsync(p => p.Key == SupportInfoKey && !p.IsDeleted);
        
        if (existing != null)
        {
            existing.Value = jsonValue;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = User.Identity?.Name;
            await _unitOfWork.Publics.UpdateAsync(existing);
        }
        else
        {
            var newPublic = new Public
            {
                Key = SupportInfoKey,
                Value = jsonValue,
                Description = "Support contact information (emails and phone numbers)",
                IsActive = true,
                CreatedOn = DateTime.UtcNow,
                CreatedBy = User.Identity?.Name
            };
            await _unitOfWork.Publics.AddAsync(newPublic);
        }
        
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Support information updated successfully.",
            Result = true
        });
    }

    /// <summary>
    /// Delete public configuration (authorized)
    /// </summary>
    [HttpDelete("{key}")]
    [Authorize]
    public async Task<IActionResult> Delete(string key)
    {
        var publicData = await _unitOfWork.Publics.FindAsync(p => p.Key == key && !p.IsDeleted);
        
        if (publicData == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Public configuration not found.",
                Result = false
            });
        }

        publicData.IsDeleted = true;
        publicData.UpdatedAt = DateTime.UtcNow;
        publicData.UpdatedBy = User.Identity?.Name;
        await _unitOfWork.Publics.UpdateAsync(publicData);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Public configuration deleted successfully.",
            Result = true
        });
    }
}

