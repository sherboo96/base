using Microsoft.AspNetCore.Http;

namespace UMS.Dtos;

public class DigitalLibraryItemDto
{
    public int? Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Description { get; set; }
    public string? PosterPath { get; set; } // Optional - can be set from PosterFile upload
    public IFormFile? PosterFile { get; set; } // For upload
    
    public int? CourseId { get; set; }
    public string? CourseName { get; set; }
    public int OrganizationId { get; set; }
    public bool ShowPublic { get; set; }
    
    public List<DigitalLibraryFileDto> Files { get; set; } = new List<DigitalLibraryFileDto>();
    
    // For list display
    public int FilesCount { get; set; }
}

public class DigitalLibraryFileDto
{
    public int? Id { get; set; }
    public int DigitalLibraryItemId { get; set; }
    public string Title { get; set; }
    public string FilePath { get; set; }
    public IFormFile? File { get; set; } // For upload
    public int FileType { get; set; } // Enum as int
    
    public int? DurationSeconds { get; set; }
    public int? PageCount { get; set; }
}

public class UserDigitalLibraryProgressDto
{
    public int? Id { get; set; }
    public string UserId { get; set; }
    public int DigitalLibraryFileId { get; set; }
    public bool IsCompleted { get; set; }
    public int LastPositionSeconds { get; set; }
    public DateTime? CompletedOn { get; set; }
}
