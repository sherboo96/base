using UMS.Data;
using UMS.Interfaces;
using UMS.Models;

namespace UMS.Services;

public class SystemConfigurationService
{
    private readonly ApplicationDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<SystemConfigurationService> _logger;

    public SystemConfigurationService(
        ApplicationDbContext context,
        IUnitOfWork unitOfWork,
        ILogger<SystemConfigurationService> logger)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    /// <summary>
    /// Gets a system configuration value by key
    /// </summary>
    public async Task<string?> GetConfigurationValueAsync(string key)
    {
        var config = await _unitOfWork.SystemConfigurations.FindAsync(c => c.Key == key);
        return config?.Value;
    }

    /// <summary>
    /// Sets or updates a system configuration value
    /// </summary>
    public async Task SetConfigurationValueAsync(string key, string value, string? description = null)
    {
        var existingConfig = await _unitOfWork.SystemConfigurations.FindAsync(c => c.Key == key);
        
        if (existingConfig != null)
        {
            existingConfig.Value = value;
            if (!string.IsNullOrEmpty(description))
                existingConfig.Description = description;
            existingConfig.UpdatedAt = DateTime.UtcNow;
            await _unitOfWork.SystemConfigurations.UpdateAsync(existingConfig);
        }
        else
        {
            var newConfig = new SystemConfiguration
            {
                Key = key,
                Value = value,
                Description = description,
                IsActive = true,
                CreatedBy = "System",
                CreatedOn = DateTime.UtcNow
            };
            await _unitOfWork.SystemConfigurations.AddAsync(newConfig);
        }
        
        await _unitOfWork.CompleteAsync();
    }

    /// <summary>
    /// Checks if a specific login method is enabled
    /// </summary>
    public async Task<bool> IsLoginMethodEnabledAsync(LoginMethod loginMethod)
    {
        var key = loginMethod switch
        {
            LoginMethod.Credentials => "LoginMethod.Credentials.Enabled",
            LoginMethod.ActiveDirectory => "LoginMethod.ActiveDirectory.Enabled",
            LoginMethod.KMNID => "LoginMethod.KMNID.Enabled",
            _ => null
        };

        if (key == null) return false;

        var value = await GetConfigurationValueAsync(key);
        return bool.TryParse(value, out var enabled) && enabled;
    }

    /// <summary>
    /// Gets the default login method from configuration
    /// </summary>
    public async Task<LoginMethod> GetDefaultLoginMethodAsync()
    {
        var defaultMethod = await GetConfigurationValueAsync("LoginMethod.Default");
        if (Enum.TryParse<LoginMethod>(defaultMethod ?? "ActiveDirectory", out var method))
        {
            return method;
        }
        return LoginMethod.ActiveDirectory;
    }
}

