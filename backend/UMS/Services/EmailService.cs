using System.Net;
using System.Net.Mail;
using System.Text;
using UMS.Interfaces;

namespace UMS.Services;

public class EmailService
{
    private readonly SystemConfigurationService _configService;
    private readonly ILogger<EmailService> _logger;

    public EmailService(
        SystemConfigurationService configService,
        ILogger<EmailService> logger)
    {
        _configService = configService;
        _logger = logger;
    }

    /// <summary>
    /// Gets SMTP configuration from system configuration
    /// </summary>
    private async Task<SmtpConfig> GetSmtpConfigAsync()
    {
        var host = await _configService.GetConfigurationValueAsync("Smtp:Host") ?? "smtp.office365.com";
        var portStr = await _configService.GetConfigurationValueAsync("Smtp:Port") ?? "587";
        var username = await _configService.GetConfigurationValueAsync("Smtp:Username") ?? "";
        var password = await _configService.GetConfigurationValueAsync("Smtp:Password") ?? "";
        var fromName = await _configService.GetConfigurationValueAsync("Smtp:FromName") ?? "Ministry of Oil";
        var fromEmail = await _configService.GetConfigurationValueAsync("Smtp:FromEmail") ?? "";
        var enableSslStr = await _configService.GetConfigurationValueAsync("Smtp:EnableSsl") ?? "true";

        // Decrypt password if encrypted
        password = DecryptPassword(password);

        int.TryParse(portStr, out var port);
        bool.TryParse(enableSslStr, out var enableSsl);

        return new SmtpConfig
        {
            Host = host,
            Port = port,
            Username = username,
            Password = password,
            FromName = fromName,
            FromEmail = fromEmail,
            EnableSsl = enableSsl
        };
    }

    /// <summary>
    /// Decrypts password from encrypted format
    /// </summary>
    private string DecryptPassword(string encryptedPassword)
    {
        // If password starts with encrypted marker, decrypt it
        // For now, simple base64 decode (in production, use proper encryption)
        if (string.IsNullOrEmpty(encryptedPassword))
            return encryptedPassword;

        try
        {
            // Check if it's encrypted (starts with "ENC:")
            if (encryptedPassword.StartsWith("ENC:"))
            {
                var base64 = encryptedPassword.Substring(4);
                var bytes = Convert.FromBase64String(base64);
                return Encoding.UTF8.GetString(bytes);
            }
            return encryptedPassword;
        }
        catch
        {
            return encryptedPassword;
        }
    }

    /// <summary>
    /// Encrypts password for storage
    /// </summary>
    public static string EncryptPassword(string password)
    {
        if (string.IsNullOrEmpty(password))
            return password;

        // Simple base64 encoding (in production, use proper encryption)
        var bytes = Encoding.UTF8.GetBytes(password);
        var base64 = Convert.ToBase64String(bytes);
        return $"ENC:{base64}";
    }

    /// <summary>
    /// Sends an email using SMTP
    /// </summary>
    public async Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true)
    {
        try
        {
            var config = await GetSmtpConfigAsync();

            if (string.IsNullOrEmpty(config.Host) || string.IsNullOrEmpty(config.FromEmail))
            {
                _logger.LogWarning("SMTP configuration is incomplete. Cannot send email.");
                return false;
            }

            using var client = new SmtpClient(config.Host, config.Port)
            {
                EnableSsl = config.EnableSsl,
                Credentials = new NetworkCredential(config.Username, config.Password)
            };

            using var message = new MailMessage
            {
                From = new MailAddress(config.FromEmail, config.FromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = isHtml,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8
            };

            message.To.Add(to);

            await client.SendMailAsync(message);
            _logger.LogInformation($"Email sent successfully to {to}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send email to {to}");
            return false;
        }
    }

    /// <summary>
    /// Sends OTP email using template
    /// </summary>
    public async Task<bool> SendOtpEmailAsync(string to, string otp, string? userName = null)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "otp-email.html");
            var template = await File.ReadAllTextAsync(templatePath);

            // Replace placeholders
            var usernameText = string.IsNullOrEmpty(userName) ? "" : $" {userName}";
            var body = template
                .Replace("{{OTP}}", otp)
                .Replace("{{USERNAME}}", usernameText)
                .Replace("{{YEAR}}", DateTime.Now.Year.ToString());

            var subject = "OTP Verification Code - Ministry of Oil";

            return await SendEmailAsync(to, subject, body, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send OTP email to {to}");
            // Fallback to simple email if template not found
            var simpleBody = $"Your OTP code is: {otp}\n\nThis code will expire in 5 minutes.";
            return await SendEmailAsync(to, "OTP Verification Code", simpleBody, false);
        }
    }

    private class SmtpConfig
    {
        public string Host { get; set; } = "";
        public int Port { get; set; } = 587;
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string FromName { get; set; } = "";
        public string FromEmail { get; set; } = "";
        public bool EnableSsl { get; set; } = true;
    }
}
