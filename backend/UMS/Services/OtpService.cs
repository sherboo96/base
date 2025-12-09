using UMS.Models;
using UMS.Interfaces;

namespace UMS.Services;

public class OtpService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly EmailService _emailService;
    private readonly Random _random = new Random();
    private static readonly Dictionary<string, (string Otp, DateTime Expires)> _otpCache = new();

    public OtpService(IUnitOfWork unitOfWork, EmailService emailService)
    {
        _unitOfWork = unitOfWork;
        _emailService = emailService;
    }

    /// <summary>
    /// Generates a 6-digit OTP code
    /// </summary>
    public string GenerateOtp()
    {
        return _random.Next(100000, 999999).ToString();
    }

    /// <summary>
    /// Generates and stores OTP for a user with expiration
    /// </summary>
    public async Task<string> GenerateAndStoreOtpAsync(string userId, string email, string? userName = null)
    {
        var otp = GenerateOtp();
        var expires = DateTime.UtcNow.AddMinutes(5);
        
        // Store OTP in memory cache with expiration
        lock (_otpCache)
        {
            _otpCache[userId] = (otp, expires);
        }
        
        // Send OTP via email
        await _emailService.SendOtpEmailAsync(email, otp, userName ?? "");
        
        return otp;
    }

    /// <summary>
    /// Verifies OTP for a user
    /// </summary>
    public async Task<bool> VerifyOtpAsync(string userId, string otp)
    {
        if (string.IsNullOrEmpty(otp) || otp.Length != 6 || !otp.All(char.IsDigit))
        {
            return false;
        }

        lock (_otpCache)
        {
            // Clean expired OTPs
            var expiredKeys = _otpCache.Where(kvp => kvp.Value.Expires < DateTime.UtcNow).Select(kvp => kvp.Key).ToList();
            foreach (var key in expiredKeys)
            {
                _otpCache.Remove(key);
            }

            // Check if OTP exists and is valid
            if (_otpCache.TryGetValue(userId, out var stored))
            {
                if (stored.Otp == otp && stored.Expires > DateTime.UtcNow)
                {
                    // Remove OTP after successful verification
                    _otpCache.Remove(userId);
                    return true;
                }
            }
        }

        return false;
    }

}
