namespace UMS.Dtos;

public class BulkDepartmentUploadRequest
{
    public List<BulkDepartmentUploadItem> Departments { get; set; } = new List<BulkDepartmentUploadItem>();
}

public class BulkDepartmentUploadItem
{
    public string NameEn { get; set; }
    public string NameAr { get; set; }
    public string Code { get; set; }
    public string Type { get; set; }
    public string Level { get; set; }
    public int OrganizationId { get; set; }
    public int? ParentDepartmentId { get; set; }
    public int? OriginalId { get; set; } // Original ID from JSON for parent mapping
}

public class BulkDepartmentUploadResponse
{
    public int Total { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<BulkDepartmentUploadResult> Results { get; set; } = new List<BulkDepartmentUploadResult>();
}

public class BulkDepartmentUploadResult
{
    public string NameEn { get; set; }
    public string NameAr { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? NewId { get; set; } // New department ID if created successfully
}

