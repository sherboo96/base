using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos;
using UMS.Dtos.Shared;
using UMS.Models;
using UMS.Services;
using System.IO;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]

public class LocationsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly OrganizationAccessService _orgAccessService;

    public LocationsController(IUnitOfWork unitOfWork, OrganizationAccessService orgAccessService)
    {
        _unitOfWork = unitOfWork;
        _orgAccessService = orgAccessService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string search = null,
        [FromQuery] int? organizationId = null,
        [FromQuery] string filterCategory = "all") // "all", "onsite", "online", "outsite", "abroad"
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0) pageSize = 10;

        var skip = (page - 1) * pageSize;

        // Build filter expression
        var hasSearch = !string.IsNullOrWhiteSpace(search);
        var searchLower = hasSearch ? search.ToLower().Trim() : "";
        var hasCategoryFilter = filterCategory != "all";
        LocationCategory? categoryFilter = null;
        if (hasCategoryFilter)
        {
            categoryFilter = filterCategory.ToLower() switch
            {
                "onsite" => LocationCategory.Onsite,
                "online" => LocationCategory.Online,
                "outsite" => LocationCategory.OutSite,
                "abroad" => LocationCategory.Abroad,
                _ => null
            };
        }

        // Get organization filter based on user's role
        var orgFilter = await _orgAccessService.GetOrganizationFilterAsync();
        var effectiveOrgFilter = organizationId ?? orgFilter;

        Expression<Func<Location, bool>> filter = x =>
            !x.IsDeleted &&
            (!hasSearch ||
             x.Name.ToLower().Contains(searchLower) ||
             (x.NameAr != null && x.NameAr.ToLower().Contains(searchLower)) ||
             (x.Floor != null && x.Floor.ToLower().Contains(searchLower)) ||
             (x.Building != null && x.Building.ToLower().Contains(searchLower)) ||
             (x.Url != null && x.Url.ToLower().Contains(searchLower))) &&
            (!effectiveOrgFilter.HasValue || x.OrganizationId == effectiveOrgFilter.Value) &&
            (!hasCategoryFilter || !categoryFilter.HasValue || x.Category == categoryFilter.Value);

        var total = await _unitOfWork.Locations.CountAsync(filter);
        var data = await _unitOfWork.Locations.GetAllAsync(
            pageSize,
            skip,
            filter,
            null,
            null,
            new[] { "Organization" }
        );

        var response = new BaseResponse<IEnumerable<Location>>
        {
            StatusCode = 200,
            Message = "Locations retrieved successfully.",
            Result = data,
            Total = total,
            Pagination = new Pagination
            {
                CurrentPage = page,
                PageSize = pageSize,
                Total = total
            }
        };

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var item = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        return item == null
            ? NotFound(new BaseResponse<Location> { StatusCode = 404, Message = "Location not found." })
            : Ok(new BaseResponse<Location> { StatusCode = 200, Message = "Location retrieved successfully.", Result = item });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] LocationDto dto)
    {
        // Ensure Category is valid
        if (!Enum.IsDefined(typeof(LocationCategory), dto.Category))
        {
            return BadRequest(new BaseResponse<Location> { StatusCode = 400, Message = "Invalid location category." });
        }
        
        var entity = await _unitOfWork.Locations.AddAsync(dto);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the created entity with Organization relationship
        var createdId = ((Location)entity).Id;
        var result = await _unitOfWork.Locations.FindAsync(x => x.Id == createdId && !x.IsDeleted, new[] { "Organization" });
        return CreatedAtAction(nameof(GetById), new { id = createdId }, new BaseResponse<Location> { StatusCode = 201, Message = "Location created successfully.", Result = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] LocationDto dto)
    {
        var existing = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Location> { StatusCode = 404, Message = "Location not found." });

        // Ensure Category is valid
        if (!Enum.IsDefined(typeof(LocationCategory), dto.Category))
        {
            return BadRequest(new BaseResponse<Location> { StatusCode = 400, Message = "Invalid location category." });
        }

        existing.Name = dto.Name;
        existing.NameAr = dto.NameAr;
        existing.Floor = dto.Floor;
        existing.Building = dto.Building;
        existing.Category = dto.Category;
        existing.OrganizationId = dto.OrganizationId;
        existing.Logo = dto.Logo;
        existing.Template = dto.Template;
        existing.Url = dto.Url;
        existing.UpdatedAt = DateTime.Now;

        var updated = await _unitOfWork.Locations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        
        // Fetch the updated entity with Organization relationship
        var result = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted, new[] { "Organization" });
        return Ok(new BaseResponse<Location> { StatusCode = 200, Message = "Location updated successfully.", Result = result });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null) return NotFound(new BaseResponse<Location> { StatusCode = 404, Message = "Location not found." });
        
        existing.IsDeleted = true;
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.Locations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();
        return Ok(new BaseResponse<bool> { StatusCode = 200, Message = "Location deleted successfully.", Result = true });
    }

    [HttpPatch("{id}/toggle-status")]
    public async Task<IActionResult> ToggleStatus(int id)
    {
        var existing = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool>
            {
                StatusCode = 404,
                Message = "Location not found.",
                Result = false
            });
        }

        existing.IsActive = !existing.IsActive;
        existing.UpdatedAt = DateTime.Now;

        await _unitOfWork.Locations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<Location>
        {
            StatusCode = 200,
            Message = $"Location {(existing.IsActive ? "activated" : "deactivated")} successfully.",
            Result = existing
        });
    }

    [HttpPost("{id}/upload-logo")]
    public async Task<IActionResult> UploadLogo(int id, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "No file uploaded.", Result = false });
        }

        var existing = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Location not found.", Result = false });
        }

        // Validate file type (images only)
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp" };
        var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(fileExtension))
        {
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Invalid file type. Only image files are allowed.", Result = false });
        }

        // Create uploads directory if it doesn't exist
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "locations", "logos");
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

        // Delete old logo if exists
        if (!string.IsNullOrEmpty(existing.Logo))
        {
            var oldLogoPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", existing.Logo.TrimStart('/'));
            if (System.IO.File.Exists(oldLogoPath))
            {
                try
                {
                    System.IO.File.Delete(oldLogoPath);
                }
                catch { /* Ignore deletion errors */ }
            }
        }

        // Update location with new logo path (relative to wwwroot)
        existing.Logo = $"/uploads/locations/logos/{fileName}";
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.Locations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<object>
        {
            StatusCode = 200,
            Message = "Logo uploaded successfully.",
            Result = new { logoPath = existing.Logo }
        });
    }

    [HttpPost("{id}/upload-template")]
    public async Task<IActionResult> UploadTemplate(int id, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "No file uploaded.", Result = false });
        }

        var existing = await _unitOfWork.Locations.FindAsync(x => x.Id == id && !x.IsDeleted);
        if (existing == null)
        {
            return NotFound(new BaseResponse<bool> { StatusCode = 404, Message = "Location not found.", Result = false });
        }

        // Validate file type (documents/templates)
        var allowedExtensions = new[] { ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".html", ".htm", ".txt" };
        var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(fileExtension))
        {
            return BadRequest(new BaseResponse<bool> { StatusCode = 400, Message = "Invalid file type. Allowed types: PDF, DOC, DOCX, XLS, XLSX, HTML, TXT.", Result = false });
        }

        // Create uploads directory if it doesn't exist
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "locations", "templates");
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

        // Delete old template if exists
        if (!string.IsNullOrEmpty(existing.Template))
        {
            var oldTemplatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", existing.Template.TrimStart('/'));
            if (System.IO.File.Exists(oldTemplatePath))
            {
                try
                {
                    System.IO.File.Delete(oldTemplatePath);
                }
                catch { /* Ignore deletion errors */ }
            }
        }

        // Update location with new template path (relative to wwwroot)
        existing.Template = $"/uploads/locations/templates/{fileName}";
        existing.UpdatedAt = DateTime.Now;
        await _unitOfWork.Locations.UpdateAsync(existing);
        await _unitOfWork.CompleteAsync();

        return Ok(new BaseResponse<object>
        {
            StatusCode = 200,
            Message = "Template uploaded successfully.",
            Result = new { templatePath = existing.Template }
        });
    }
}
