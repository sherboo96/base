using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using UMS.Dtos.Shared;

namespace UMS.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AttachmentsController> _logger;

    public AttachmentsController(IWebHostEnvironment env, ILogger<AttachmentsController> logger)
    {
        _env = env;
        _logger = logger;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest(new BaseResponse<string> 
            { 
                StatusCode = 400, 
                Message = "No file uploaded.", 
                Result = null 
            });
        }

        // Validate file type (images and PDFs)
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf" };
        var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        
        if (!allowedExtensions.Contains(fileExtension))
        {
            return BadRequest(new BaseResponse<string> 
            { 
                StatusCode = 400, 
                Message = "Invalid file type. Only image files and PDFs are allowed.", 
                Result = null 
            });
        }

        // Validate file size (max 10MB for PDFs, 5MB for images)
        long maxFileSize = fileExtension == ".pdf" ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for PDF, 5MB for images
        string maxSizeMessage = fileExtension == ".pdf" ? "10MB" : "5MB";
        if (file.Length > maxFileSize)
        {
            return BadRequest(new BaseResponse<string> 
            { 
                StatusCode = 400, 
                Message = $"File size exceeds the maximum allowed size of {maxSizeMessage}.", 
                Result = null 
            });
        }

        try
        {
            // Ensure wwwroot/uploads directory exists
            // WebRootPath is typically wwwroot, so we don't need to add "wwwroot" again
            var uploadsPath = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");
            if (!Directory.Exists(uploadsPath))
            {
                Directory.CreateDirectory(uploadsPath);
            }

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{fileExtension}";
            var filePath = Path.Combine(uploadsPath, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return relative path for frontend (static files are served at root)
            var relativePath = $"/uploads/{fileName}";

            return Ok(new BaseResponse<string>
            {
                StatusCode = 200,
                Message = "File uploaded successfully.",
                Result = relativePath
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file");
            return StatusCode(500, new BaseResponse<string>
            {
                StatusCode = 500,
                Message = "An error occurred while uploading the file.",
                Result = null
            });
        }
    }

    [HttpDelete("delete")]
    public IActionResult DeleteFile([FromQuery] string filePath)
    {
        if (string.IsNullOrEmpty(filePath))
        {
            return BadRequest(new BaseResponse<bool>
            {
                StatusCode = 400,
                Message = "File path is required.",
                Result = false
            });
        }

        try
        {
            // Remove leading slash if present
            if (filePath.StartsWith("/"))
            {
                filePath = filePath.Substring(1);
            }

            var fullPath = Path.Combine(_env.WebRootPath ?? _env.ContentRootPath, filePath);

            // Security check: ensure file is within wwwroot
            var wwwrootPath = Path.Combine(_env.WebRootPath ?? _env.ContentRootPath, "wwwroot");
            if (!fullPath.StartsWith(wwwrootPath))
            {
                return BadRequest(new BaseResponse<bool>
                {
                    StatusCode = 400,
                    Message = "Invalid file path.",
                    Result = false
                });
            }

            if (System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
                return Ok(new BaseResponse<bool>
                {
                    StatusCode = 200,
                    Message = "File deleted successfully.",
                    Result = true
                });
            }
            else
            {
                return NotFound(new BaseResponse<bool>
                {
                    StatusCode = 404,
                    Message = "File not found.",
                    Result = false
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file");
            return StatusCode(500, new BaseResponse<bool>
            {
                StatusCode = 500,
                Message = "An error occurred while deleting the file.",
                Result = false
            });
        }
    }
}
