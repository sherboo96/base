using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UMS.Data;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class LogsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly SystemConfigurationService _configService;

    public LogsController(ApplicationDbContext context, SystemConfigurationService configService)
    {
        _context = context;
        _configService = configService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] string? search = null,
        [FromQuery] string? level = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 50;
        if (pageSize > 100) pageSize = 100; // Limit page size

        var skip = (page - 1) * pageSize;

        // Build filter expression
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? search!.ToLower().Trim() : "";
        var hasLevelFilter = !string.IsNullOrWhiteSpace(level);

        Expression<Func<Log, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Message.ToLower().Contains(searchLower) ||
             (x.Source != null && x.Source.ToLower().Contains(searchLower)) ||
             (x.UserName != null && x.UserName.ToLower().Contains(searchLower)) ||
             (x.RequestPath != null && x.RequestPath.ToLower().Contains(searchLower))) &&
            (!hasLevelFilter || x.Level == level) &&
            (!startDate.HasValue || x.Timestamp >= startDate.Value) &&
            (!endDate.HasValue || x.Timestamp <= endDate.Value.AddDays(1).AddSeconds(-1));

        var total = await _context.Logs.CountAsync(filter);

        var logs = await _context.Logs
            .Where(filter)
            .OrderByDescending(x => x.Timestamp)
            .Skip(skip)
            .Take(pageSize)
            .Select(x => new LogDto
            {
                Id = x.Id,
                Level = x.Level,
                Message = x.Message,
                Exception = x.Exception,
                StackTrace = x.StackTrace,
                Source = x.Source,
                Action = x.Action,
                UserId = x.UserId,
                UserName = x.UserName,
                IpAddress = x.IpAddress,
                RequestPath = x.RequestPath,
                RequestMethod = x.RequestMethod,
                RequestQueryString = x.RequestQueryString,
                StatusCode = x.StatusCode,
                MachineName = x.MachineName,
                Environment = x.Environment,
                Timestamp = x.Timestamp,
                CreatedOn = x.CreatedOn
            })
            .ToListAsync();

        return Ok(new BaseResponse<List<LogDto>>
        {
            StatusCode = 200,
            Message = "Logs retrieved successfully.",
            Result = logs,
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
        var log = await _context.Logs
            .Where(x => x.Id == id && !x.IsDeleted)
            .Select(x => new LogDto
            {
                Id = x.Id,
                Level = x.Level,
                Message = x.Message,
                Exception = x.Exception,
                StackTrace = x.StackTrace,
                Source = x.Source,
                Action = x.Action,
                UserId = x.UserId,
                UserName = x.UserName,
                IpAddress = x.IpAddress,
                RequestPath = x.RequestPath,
                RequestMethod = x.RequestMethod,
                RequestQueryString = x.RequestQueryString,
                StatusCode = x.StatusCode,
                MachineName = x.MachineName,
                Environment = x.Environment,
                Timestamp = x.Timestamp,
                CreatedOn = x.CreatedOn
            })
            .FirstOrDefaultAsync();

        if (log == null)
        {
            return NotFound(new BaseResponse<LogDto>
            {
                StatusCode = 404,
                Message = "Log not found."
            });
        }

        return Ok(new BaseResponse<LogDto>
        {
            StatusCode = 200,
            Message = "Log retrieved successfully.",
            Result = log
        });
    }

    [HttpGet("levels")]
    public async Task<IActionResult> GetLevels()
    {
        var levels = await _context.Logs
            .Where(x => !x.IsDeleted)
            .Select(x => x.Level)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync();

        return Ok(new BaseResponse<List<string>>
        {
            StatusCode = 200,
            Message = "Log levels retrieved successfully.",
            Result = levels
        });
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetLoggingStatus()
    {
        var configValue = await _configService.GetConfigurationValueAsync("DatabaseLoggingEnabled");
        var isEnabled = string.IsNullOrEmpty(configValue) || bool.TryParse(configValue, out var enabled) && enabled;

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = "Logging status retrieved successfully.",
            Result = isEnabled
        });
    }

    [HttpPost("toggle")]
    public async Task<IActionResult> ToggleLogging([FromBody] bool enabled)
    {
        await _configService.SetConfigurationValueAsync(
            "DatabaseLoggingEnabled",
            enabled.ToString(),
            "Enable or disable database logging. When disabled, logs will not be saved to the database."
        );

        return Ok(new BaseResponse<bool>
        {
            StatusCode = 200,
            Message = $"Database logging {(enabled ? "enabled" : "disabled")} successfully.",
            Result = enabled
        });
    }

    [HttpDelete]
    public async Task<IActionResult> DeleteLogs(
        [FromQuery] string? search = null,
        [FromQuery] string? level = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        // Build filter expression (same as GetAll)
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? search!.ToLower().Trim() : "";
        var hasLevelFilter = !string.IsNullOrWhiteSpace(level);

        Expression<Func<Log, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Message.ToLower().Contains(searchLower) ||
             (x.Source != null && x.Source.ToLower().Contains(searchLower)) ||
             (x.UserName != null && x.UserName.ToLower().Contains(searchLower)) ||
             (x.RequestPath != null && x.RequestPath.ToLower().Contains(searchLower))) &&
            (!hasLevelFilter || x.Level == level) &&
            (!startDate.HasValue || x.Timestamp >= startDate.Value) &&
            (!endDate.HasValue || x.Timestamp <= endDate.Value.AddDays(1).AddSeconds(-1));

        var logsToDelete = await _context.Logs
            .Where(filter)
            .ToListAsync();

        var count = logsToDelete.Count;

        if (count == 0)
        {
            return Ok(new BaseResponse<int>
            {
                StatusCode = 200,
                Message = "No logs found matching the specified filters.",
                Result = 0
            });
        }

        // Soft delete
        foreach (var log in logsToDelete)
        {
            log.IsDeleted = true;
            log.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return Ok(new BaseResponse<int>
        {
            StatusCode = 200,
            Message = $"{count} log(s) deleted successfully.",
            Result = count
        });
    }
}

