namespace UMS.Dtos.Shared;

public class BaseResponse<T>
{
    public int StatusCode { get; set; } = 500;
    public string? Message { get; set; }
    public T? Result { get; set; }
    public int? Total { get; set; }
    public Pagination? Pagination { get; set; }
}

public class Pagination
{
    public int? CurrentPage { get; set; }
    public int? PageSize { get; set; }
    public int? Total { get; set; }
}
