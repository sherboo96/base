using System.Text.Json.Serialization;
using UMS.Models.Shared;

namespace UMS.Models;

public class DigitalLibraryItem : BaseModel
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameAr { get; set; }
    public string Description { get; set; }
    public string PosterPath { get; set; }
    
    // Optional link to a specific course
    public int? CourseId { get; set; }
    public Course? Course { get; set; }
    
    // Organization ownership
    public int OrganizationId { get; set; }
    public Organization Organization { get; set; }
    
    public bool ShowPublic { get; set; } = false;

    public ICollection<DigitalLibraryFile> Files { get; set; } = new List<DigitalLibraryFile>();
}

public class DigitalLibraryFile : BaseModel
{
    public int Id { get; set; }
    public int DigitalLibraryItemId { get; set; }
    [JsonIgnore]
    public DigitalLibraryItem DigitalLibraryItem { get; set; }
    
    public string Title { get; set; }
    public string FilePath { get; set; }
    public DigitalFileType FileType { get; set; }
    
    // Metadata for the file
    public int? DurationSeconds { get; set; } // For videos/audio
    public int? PageCount { get; set; } // For documents
}

public enum DigitalFileType
{
    Video,
    PDF,
    PowerPoint,
    Image,
    Audio,
    Other
}

public class UserDigitalLibraryProgress : BaseModel
{
    public int Id { get; set; }
    
    public string UserId { get; set; }
    public User User { get; set; }
    
    public int DigitalLibraryFileId { get; set; }
    public DigitalLibraryFile DigitalLibraryFile { get; set; }
    
    public bool IsCompleted { get; set; }
    public int LastPositionSeconds { get; set; } // For videos, where they left off
    public DateTime? CompletedOn { get; set; }
}
