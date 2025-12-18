namespace UMS.Dtos;

public class BulkUserUploadRequest
{
    public List<BulkUserUploadItem> Users { get; set; } = new List<BulkUserUploadItem>();
}

public class BulkUserUploadItem
{
    public string FullName { get; set; }
    public string Email { get; set; }
    public string? Username { get; set; }
    public string? ADUsername { get; set; }
    public string? CivilNo { get; set; }
    public int OrganizationId { get; set; }
    public int LoginMethod { get; set; }
}

public class BulkUserUploadResponse
{
    public int Total { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<BulkUserUploadResult> Results { get; set; } = new List<BulkUserUploadResult>();
}

public class BulkUserUploadResult
{
    public string Email { get; set; }
    public string FullName { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

