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
        
        // If password field and value is empty, keep existing value
        if (key.ToLower().Contains("password") && string.IsNullOrEmpty(value) && existingConfig != null)
        {
            // Keep existing password, only update description if provided
            if (!string.IsNullOrEmpty(description))
            {
                existingConfig.Description = description;
                existingConfig.UpdatedAt = DateTime.UtcNow;
                await _unitOfWork.SystemConfigurations.UpdateAsync(existingConfig);
            }
            await _unitOfWork.CompleteAsync();
            return;
        }

        // Encrypt password fields if value is provided
        if (key.ToLower().Contains("password") && !string.IsNullOrEmpty(value) && !value.StartsWith("ENC:"))
        {
            value = EmailService.EncryptPassword(value);
        }

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
    /// Masks password values for display
    /// </summary>
    public static string MaskPassword(string key, string value)
    {
        if (key.ToLower().Contains("password") && !string.IsNullOrEmpty(value))
        {
            if (value.Length <= 4)
            {
                return new string('*', value.Length);
            }
            // Show first 4 chars and last 2 chars: Pass********rd
            var firstPart = value.Substring(0, 4);
            var lastPart = value.Length > 8 ? value.Substring(value.Length - 2) : "";
            var maskedLength = Math.Max(value.Length - 4 - (lastPart.Length > 0 ? lastPart.Length : 0), 8);
            return firstPart + new string('*', maskedLength) + lastPart;
        }
        return value;
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
            LoginMethod.OTPVerification => "LoginMethod.OTP.Enabled", // OTP Verification
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

