using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Interfaces;
using UMS.Models;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class SystemConfigurationsController : ControllerBase
{
    private readonly SystemConfigurationService _configService;
    private readonly IUnitOfWork _unitOfWork;

    public SystemConfigurationsController(
        SystemConfigurationService configService,
        IUnitOfWork unitOfWork)
    {
        _configService = configService;
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var configurations = await _unitOfWork.SystemConfigurations.GetAllAsync(c => c.IsActive && !c.IsDeleted);
        
        var result = configurations.Select(c => new SystemConfigurationDto
        {
            Key = c.Key,
            Value = SystemConfigurationService.MaskPassword(c.Key, c.Value),
            Description = c.Description
        }).ToList();

        return Ok(new BaseResponse<IEnumerable<SystemConfigurationDto>>
        {
            StatusCode = 200,
            Message = "System configurations retrieved successfully.",
            Result = result
        });
    }

    [HttpGet("{key}")]
    public async Task<IActionResult> GetByKey(string key)
    {
        var config = await _unitOfWork.SystemConfigurations.FindAsync(c => c.Key == key && c.IsActive && !c.IsDeleted);
        
        if (config == null)
        {
            return NotFound(new BaseResponse<SystemConfigurationDto>
            {
                StatusCode = 404,
                Message = "Configuration not found.",
                Result = null
            });
        }

        var result = new SystemConfigurationDto
        {
            Key = config.Key,
            Value = SystemConfigurationService.MaskPassword(config.Key, config.Value),
            Description = config.Description
        };

        return Ok(new BaseResponse<SystemConfigurationDto>
        {
            StatusCode = 200,
            Message = "System configuration retrieved successfully.",
            Result = result
        });
    }

    [HttpPut("{key}")]
    public async Task<IActionResult> Update(string key, [FromBody] SystemConfigurationDto dto)
    {
        if (dto == null)
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Request body is required.",
                Result = false
            });
        }

        // Allow empty value for password fields (to keep existing password)
        var isPasswordField = key.ToLower().Contains("password");
        if (!isPasswordField && string.IsNullOrWhiteSpace(dto.Value))
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Value is required.",
                Result = false
            });
        }

        // If password field and value is masked (contains only *) or empty, don't update it
        if (isPasswordField)
        {
            var existingConfig = await _unitOfWork.SystemConfigurations.FindAsync(c => c.Key == key);
            if (existingConfig != null && (string.IsNullOrEmpty(dto.Value) || dto.Value.All(c => c == '*')))
            {
                // Value is masked or empty, don't update password
                await _configService.SetConfigurationValueAsync(key, "", dto.Description);
                return Ok(new BaseResponse<bool>
                {
                    StatusCode = 200,
                    Message = "System configuration updated successfully (password unchanged).",
                    Result = true
                });
            }
        }

        await _configService.SetConfigurationValueAsync(key, dto.Value ?? "", dto.Description);

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "System configuration updated successfully.",
            Result = true
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SystemConfigurationDto dto)
    {
        if (dto == null || string.IsNullOrWhiteSpace(dto.Key) || string.IsNullOrWhiteSpace(dto.Value))
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "Key and Value are required.",
                Result = false
            });
        }

        // Check if key already exists
        var existing = await _unitOfWork.SystemConfigurations.FindAsync(c => c.Key == dto.Key);
        if (existing != null)
        {
            return Conflict(new BaseResponse<bool>
            {
                StatusCode = 409,
                Message = "Configuration key already exists.",
                Result = false
            });
        }

        await _configService.SetConfigurationValueAsync(dto.Key, dto.Value, dto.Description);

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "System configuration created successfully.",
            Result = true
        });
    }
}
