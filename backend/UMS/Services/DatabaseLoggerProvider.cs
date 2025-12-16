using Microsoft.Extensions.Logging;
using UMS.Data;
using UMS.Models;
using Microsoft.EntityFrameworkCore;

namespace UMS.Services;

public class DatabaseLoggerProvider : ILoggerProvider
{
    private readonly IServiceProvider _serviceProvider;

    public DatabaseLoggerProvider(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public ILogger CreateLogger(string categoryName)
    {
        return new DatabaseLogger(categoryName, _serviceProvider);
    }

    public void Dispose()
    {
        // Nothing to dispose
    }
}

public class DatabaseLogger : ILogger
{
    private readonly string _categoryName;
    private readonly IServiceProvider _serviceProvider;

    public DatabaseLogger(string categoryName, IServiceProvider serviceProvider)
    {
        _categoryName = categoryName;
        _serviceProvider = serviceProvider;
    }

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull
    {
        return null;
    }

    public bool IsEnabled(LogLevel logLevel)
    {
        // Log Information, Warning, Error, and Critical
        return logLevel >= LogLevel.Information;
    }

    public void Log<TState>(
        LogLevel logLevel,
        EventId eventId,
        TState state,
        Exception? exception,
        Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel))
            return;

        // Check if database logging is enabled via system configuration
        if (!IsDatabaseLoggingEnabled())
            return;

        try
        {
            var message = formatter(state, exception);
            var httpContextAccessor = _serviceProvider.GetService<IHttpContextAccessor>();
            var httpContext = httpContextAccessor?.HttpContext;

            // Get user information from HttpContext
            string? userId = null;
            string? userName = null;
            if (httpContext?.User?.Identity?.IsAuthenticated == true)
            {
                userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                userName = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;
            }

            // Get request information
            string? requestPath = httpContext?.Request?.Path.Value;
            string? requestMethod = httpContext?.Request?.Method;
            string? queryString = httpContext?.Request?.QueryString.Value;
            string? ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
            int? statusCode = httpContext?.Response?.StatusCode;

            // Extract source and action from category name
            var parts = _categoryName.Split('.');
            string? source = parts.Length > 0 ? parts[parts.Length - 1] : _categoryName;
            string? action = null;

            // Try to get request body for POST/PUT requests (if available)
            string? requestBody = null;
            if (httpContext?.Request?.Method == "POST" || httpContext?.Request?.Method == "PUT")
            {
                // Note: Reading request body here might not work as it may have already been read
                // This is a limitation - for full request body logging, use middleware
            }

            var log = new Log
            {
                Level = logLevel.ToString(),
                Message = message,
                Exception = exception?.ToString(),
                StackTrace = exception?.StackTrace,
                Source = source,
                Action = action,
                UserId = userId,
                UserName = userName,
                IpAddress = ipAddress,
                RequestPath = requestPath,
                RequestMethod = requestMethod,
                RequestQueryString = queryString,
                RequestBody = requestBody,
                StatusCode = statusCode > 0 ? statusCode : null,
                MachineName = Environment.MachineName,
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown",
                Timestamp = DateTime.UtcNow,
                IsActive = true,
                IsDeleted = false,
                CreatedOn = DateTime.UtcNow
            };

            // Use a background task to avoid blocking the main thread
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                    await dbContext.Logs.AddAsync(log);
                    await dbContext.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    // Fallback to console if database logging fails
                    Console.WriteLine($"Failed to write log to database: {ex.Message}");
                }
            });
        }
        catch (Exception ex)
        {
            // Fallback to console if logging fails
            Console.WriteLine($"Error in DatabaseLogger: {ex.Message}");
        }
    }

    private bool IsDatabaseLoggingEnabled()
    {
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            var config = dbContext.SystemConfigurations
                .FirstOrDefault(c => c.Key == "DatabaseLoggingEnabled" && c.IsActive && !c.IsDeleted);
            
            // Default to enabled if configuration doesn't exist
            if (config == null)
                return true;
            
            return bool.TryParse(config.Value, out var enabled) && enabled;
        }
        catch
        {
            // Default to enabled if check fails
            return true;
        }
    }
}

