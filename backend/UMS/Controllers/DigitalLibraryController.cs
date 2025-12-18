using AutoMapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UMS.Data;
using UMS.Dtos;
using UMS.Models;
using UMS.Interfaces;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using UMS.Dtos.Shared;

namespace UMS.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DigitalLibraryController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMapper _mapper;
        private readonly UserManager<User> _userManager;
        private readonly ApplicationDbContext _context; // Access DbContext directly for complex queries not covered by UnitOfWork for now
        private readonly ILogger<DigitalLibraryController> _logger;
        private readonly IWebHostEnvironment _environment;

        public DigitalLibraryController(
            IUnitOfWork unitOfWork,
            IMapper mapper,
            UserManager<User> userManager,
            ApplicationDbContext context,
            ILogger<DigitalLibraryController> logger,
            IWebHostEnvironment environment)
        {
            _unitOfWork = unitOfWork;
            _mapper = mapper;
            _userManager = userManager;
            _context = context;
            _logger = logger;
            _environment = environment;
        }

        // ==================== Public Endpoints ====================

        [HttpGet("public/{routeCode}")]
        public async Task<ActionResult<BaseResponse<List<DigitalLibraryItemDto>>>> GetPublicItems(string routeCode)
        {
            // Find CourseTab by RouteCode
            var courseTab = await _context.CourseTabs
                .FirstOrDefaultAsync(ct => ct.RouteCode == routeCode && !ct.IsDeleted && ct.IsActive);

            if (courseTab == null)
            {
                return NotFound(new BaseResponse<List<DigitalLibraryItemDto>> { StatusCode = 404, Message = "Course Tab not found" });
            }

            // Get items associated with this tab's courses, or just general items if we link them to tabs directly.
            // My model links items to generic Organization, and OPTIONAL CourseId.
            // The requirement was "Digital library will be new catgeory".
            // If the routeCode corresponds to a CourseTab, we should probably filter items that are related to courses in this tab, 
            // OR items that are explicitly linked to this tab (if we had that link).
            // Since we linked Item -> Course, and Course -> CourseTab, we can filter Item -> Course -> CourseTab.
            
            var items = await _context.DigitalLibraryItems
                .Include(i => i.Course)
                .Include(i => i.Files)
                .Where(i => !i.IsDeleted && i.ShowPublic 
                            && (i.CourseId == null || i.Course.CourseTabId == courseTab.Id))
                .ToListAsync();

            var result = _mapper.Map<List<DigitalLibraryItemDto>>(items);
            
            // TODO: Populate progress for the user if needed

            return Ok(new BaseResponse<List<DigitalLibraryItemDto>> { StatusCode = 200, Message = "Success", Result = result });
        }

        [HttpGet("items/{id}")]
        public async Task<ActionResult<BaseResponse<DigitalLibraryItemDto>>> GetItemDetails(int id)
        {
            var item = await _context.DigitalLibraryItems
                .Include(i => i.Files)
                .Include(i => i.Course)
                .FirstOrDefaultAsync(i => i.Id == id && !i.IsDeleted);

            if (item == null)
            {
                return NotFound(new BaseResponse<DigitalLibraryItemDto> { StatusCode = 404, Message = "Item not found" });
            }

            var result = _mapper.Map<DigitalLibraryItemDto>(item);
            return Ok(new BaseResponse<DigitalLibraryItemDto> { StatusCode = 200, Message = "Success", Result = result });
        }
        
        [HttpPost("progress")]
        public async Task<ActionResult<BaseResponse<string>>> UpdateProgress([FromBody] UserDigitalLibraryProgressDto progressDto)
        {
             var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("UserId")?.Value;
             if (string.IsNullOrEmpty(userId)) return Unauthorized();

             var progress = await _context.UserDigitalLibraryProgresses
                 .FirstOrDefaultAsync(p => p.UserId == userId && p.DigitalLibraryFileId == progressDto.DigitalLibraryFileId);
                 
             if (progress == null)
             {
                 progress = new UserDigitalLibraryProgress
                 {
                     UserId = userId,
                     DigitalLibraryFileId = progressDto.DigitalLibraryFileId,
                     CreatedBy = userId,
                     CreatedOn = DateTime.UtcNow
                 };
                 await _context.UserDigitalLibraryProgresses.AddAsync(progress);
             }
             
             progress.IsCompleted = progressDto.IsCompleted;
             progress.LastPositionSeconds = progressDto.LastPositionSeconds;
             if (progress.IsCompleted && progress.CompletedOn == null)
             {
                 progress.CompletedOn = DateTime.UtcNow;
             }
             progress.UpdatedAt = DateTime.UtcNow;
             progress.UpdatedBy = userId;
             
             await _context.SaveChangesAsync();
             
             return Ok(new BaseResponse<string> { StatusCode = 200, Message = "Progress updated" });
        }

        // ==================== Management Endpoints ====================

        [HttpGet]
        public async Task<ActionResult<BaseResponse<List<DigitalLibraryItemDto>>>> GetAllItems([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] int? courseTabId = null)
        {
            var query = _context.DigitalLibraryItems
                .Include(i => i.Course)
                .Include(i => i.Files)
                .Where(i => !i.IsDeleted);

            if (courseTabId.HasValue)
            {
               query = query.Where(i => i.Course != null && i.Course.CourseTabId == courseTabId.Value);
            }

            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            var result = _mapper.Map<List<DigitalLibraryItemDto>>(items);

             return Ok(new BaseResponse<List<DigitalLibraryItemDto>> 
             { 
                 StatusCode = 200, 
                 Message = "Success", 
                 Result = result,
                 Total = total,
                 Pagination = new Pagination { CurrentPage = page, PageSize = pageSize, Total = total }
             });
        }
        
        [HttpPost]
        public async Task<ActionResult<BaseResponse<DigitalLibraryItemDto>>> CreateItem([FromForm] DigitalLibraryItemDto dto)
        {
             // Set default PosterPath before mapping to avoid validation errors
             if (string.IsNullOrWhiteSpace(dto.PosterPath) && dto.PosterFile == null)
             {
                 dto.PosterPath = string.Empty;
             }
             
             var item = _mapper.Map<DigitalLibraryItem>(dto);
             
             // Initial Default values
             item.CreatedBy = User.Identity?.Name ?? "System";
             item.CreatedOn = DateTime.UtcNow;
             item.IsActive = true;
             
             // Handle poster file upload if provided (this will override the empty string)
             if (dto.PosterFile != null)
             {
                 var fileName = Guid.NewGuid().ToString() + Path.GetExtension(dto.PosterFile.FileName);
                 var uploadPath = Path.Combine(_environment.WebRootPath, "uploads", "posters");
                 if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);
                 
                 var filePath = Path.Combine(uploadPath, fileName);
                 using (var stream = new FileStream(filePath, FileMode.Create))
                 {
                     await dto.PosterFile.CopyToAsync(stream);
                 }
                 item.PosterPath = $"/uploads/posters/{fileName}";
             }
             else if (string.IsNullOrWhiteSpace(item.PosterPath))
             {
                 // Ensure PosterPath is never null
                 item.PosterPath = string.Empty;
             }

             await _context.DigitalLibraryItems.AddAsync(item);
             await _context.SaveChangesAsync();
             
             return Ok(new BaseResponse<DigitalLibraryItemDto> { StatusCode = 200, Message = "Created successfully", Result = _mapper.Map<DigitalLibraryItemDto>(item) });
        }
        
        [HttpPut("{id}")]
        public async Task<ActionResult<BaseResponse<DigitalLibraryItemDto>>> UpdateItem(int id, [FromForm] DigitalLibraryItemDto dto)
        {
            var item = await _context.DigitalLibraryItems.FindAsync(id);
            if (item == null) return NotFound(new BaseResponse<DigitalLibraryItemDto> { StatusCode = 404, Message = "Item not found" });

            // Update properties
            item.Name = dto.Name;
            item.NameAr = dto.NameAr;
            item.Description = dto.Description;
            item.CourseId = dto.CourseId;
            item.ShowPublic = dto.ShowPublic;
            item.UpdatedBy = User.Identity?.Name ?? "System";
            item.UpdatedAt = DateTime.UtcNow;

            // Handle poster file upload if provided
            if (dto.PosterFile != null)
            {
                var fileName = Guid.NewGuid().ToString() + Path.GetExtension(dto.PosterFile.FileName);
                var uploadPath = Path.Combine(_environment.WebRootPath, "uploads", "posters");
                if (!Directory.Exists(uploadPath)) Directory.CreateDirectory(uploadPath);
                
                var filePath = Path.Combine(uploadPath, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await dto.PosterFile.CopyToAsync(stream);
                }
                item.PosterPath = $"/uploads/posters/{fileName}";
            }

            await _context.SaveChangesAsync();
            
            return Ok(new BaseResponse<DigitalLibraryItemDto> { StatusCode = 200, Message = "Updated successfully", Result = _mapper.Map<DigitalLibraryItemDto>(item) });
        }
        
        [HttpDelete("{id}")]
        public async Task<ActionResult<BaseResponse<string>>> DeleteItem(int id)
        {
            var item = await _context.DigitalLibraryItems.FindAsync(id);
            if (item == null) return NotFound(new BaseResponse<string> { StatusCode = 404, Message = "Not found" });
            
            item.IsDeleted = true;
            item.UpdatedBy = User.Identity?.Name ?? "System";
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return Ok(new BaseResponse<string> { StatusCode = 200, Message = "Deleted successfully" });
        }
    }
}
