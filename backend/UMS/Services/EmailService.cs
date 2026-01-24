using System.Net;
using System.Net.Mail;
using System.Text;
using System.Net.Mime;
using UMS.Interfaces;
using Microsoft.AspNetCore.Hosting;
using UMS.Models;

namespace UMS.Services;

public class EmailService
{
    private readonly SystemConfigurationService _configService;
    private readonly ILogger<EmailService> _logger;
    private readonly IWebHostEnvironment _env;

    public EmailService(
        SystemConfigurationService configService,
        ILogger<EmailService> logger,
        IWebHostEnvironment env)
    {
        _configService = configService;
        _logger = logger;
        _env = env;
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
    /// Sends an email with attachment and inline images using SMTP
    /// </summary>
    public async Task<bool> SendEmailWithAttachmentAsync(string to, string subject, string body, byte[]? attachmentBytes, string? attachmentFileName, string? attachmentContentType, bool isHtml = true, byte[]? inlineImageBytes = null, string? inlineImageContentId = null, string? inlineImageContentType = null)
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

            // Create alternate view for HTML body with inline images
            if (isHtml && inlineImageBytes != null && !string.IsNullOrEmpty(inlineImageContentId))
            {
                var alternateView = AlternateView.CreateAlternateViewFromString(body, null, MediaTypeNames.Text.Html);
                
                // Add inline image as LinkedResource - don't dispose the stream, it will be disposed with the message
                var imageStream = new MemoryStream(inlineImageBytes);
                var linkedResource = new LinkedResource(imageStream, inlineImageContentType ?? MediaTypeNames.Image.Jpeg)
                {
                    ContentId = inlineImageContentId
                };
                alternateView.LinkedResources.Add(linkedResource);
                message.AlternateViews.Add(alternateView);
            }

            // Add attachment only if provided - don't dispose the stream, it will be disposed with the message
            if (attachmentBytes != null && !string.IsNullOrEmpty(attachmentFileName) && !string.IsNullOrEmpty(attachmentContentType))
            {
                var attachmentStream = new MemoryStream(attachmentBytes);
                var attachment = new Attachment(attachmentStream, attachmentFileName, attachmentContentType);
                message.Attachments.Add(attachment);
            }

            await client.SendMailAsync(message);
            _logger.LogInformation($"Email with attachment sent successfully to {to}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send email with attachment to {to}");
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

    /// <summary>
    /// Sends event registration confirmation email with badge attachment
    /// </summary>
    public async Task<bool> SendEventRegistrationConfirmationAsync(
        string to,
        string attendeeName,
        string eventName,
        string? eventNameAr,
        DateTime? eventDate,
        string? eventLocation,
        string? eventLocationAr,
        string barcode,
        byte[] badgeImageBytes,
        string? shareLink = null,
        string? eventCode = null,
        string? eventPosterUrl = null)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "event-registration-confirmation.html");
            var template = await File.ReadAllTextAsync(templatePath);

            // Format event date - English format: "Monday, 12th January 2026"
            var eventDateText = "TBA";
            if (eventDate.HasValue)
            {
                var date = eventDate.Value;
                var dayName = date.ToString("dddd");
                var day = date.Day;
                var monthName = date.ToString("MMMM");
                var year = date.Year;
                var daySuffix = GetDaySuffix(day);
                eventDateText = $"{dayName}, {day}{daySuffix} {monthName} {year}";
            }

            // Format event date - Arabic format: "الاثنين الموافق 12 يناير 2026م"
            var eventDateTextAr = "سيتم الإعلان لاحقاً";
            if (eventDate.HasValue)
            {
                var date = eventDate.Value;
                var arCulture = new System.Globalization.CultureInfo("ar-KW");
                var dayNameAr = date.ToString("dddd", arCulture);
                var day = date.Day;
                var monthNameAr = date.ToString("MMMM", arCulture);
                var year = date.Year;
                eventDateTextAr = $"{dayNameAr} الموافق {day} {monthNameAr} {year}م";
            }

            // Build event URL: https://otc.moo.gov.kw/events/{eventcode}
            var eventUrl = "";
            if (!string.IsNullOrWhiteSpace(eventCode))
            {
                eventUrl = $"https://otc.moo.gov.kw/events/{eventCode}";
            }

            // Load event poster image if provided (for inline embedding)
            byte[]? posterImageBytes = null;
            string? posterContentId = null;
            string? posterContentType = null;
            
            if (!string.IsNullOrWhiteSpace(eventPosterUrl))
            {
                try
                {
                    string posterPath = "";
                    
                    // If it's a full URL, try to extract the path
                    if (eventPosterUrl.StartsWith("http://") || eventPosterUrl.StartsWith("https://"))
                    {
                        var uri = new Uri(eventPosterUrl);
                        posterPath = uri.AbsolutePath.TrimStart('/');
                        _logger.LogInformation($"Extracted poster path from URL: {posterPath}");
                    }
                    else
                    {
                        // Remove leading slash if present (e.g., "/uploads/file.jpg" -> "uploads/file.jpg")
                        posterPath = eventPosterUrl.TrimStart('/');
                    }
                    
                    // Get the full file path - handle both WebRootPath and ContentRootPath scenarios
                    string fullPath;
                    if (!string.IsNullOrEmpty(_env.WebRootPath))
                    {
                        // WebRootPath is already the wwwroot directory
                        fullPath = Path.Combine(_env.WebRootPath, posterPath);
                    }
                    else
                    {
                        // Fallback: combine ContentRootPath with wwwroot
                        var wwwrootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                        fullPath = Path.Combine(wwwrootPath, posterPath);
                    }
                    
                    _logger.LogInformation($"Looking for poster file at: {fullPath}");
                    _logger.LogInformation($"WebRootPath: {_env.WebRootPath ?? "null"}");
                    _logger.LogInformation($"ContentRootPath: {_env.ContentRootPath}");
                    
                    // Check if file exists
                    if (System.IO.File.Exists(fullPath))
                    {
                        _logger.LogInformation($"Poster file found, reading: {fullPath}");
                        
                        // Read the image file
                        posterImageBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                        
                        // Determine MIME type based on file extension
                        var extension = Path.GetExtension(fullPath).ToLowerInvariant();
                        posterContentType = extension switch
                        {
                            ".jpg" or ".jpeg" => MediaTypeNames.Image.Jpeg,
                            ".png" => "image/png",
                            ".gif" => MediaTypeNames.Image.Gif,
                            ".webp" => "image/webp",
                            _ => MediaTypeNames.Image.Jpeg // Default
                        };
                        
                        // Generate unique Content ID for inline image
                        posterContentId = $"event-poster-{Guid.NewGuid()}";
                        
                        _logger.LogInformation($"Poster image loaded successfully. Size: {posterImageBytes.Length} bytes, ContentType: {posterContentType}, ContentId: {posterContentId}");
                    }
                    else
                    {
                        _logger.LogWarning($"Event poster file not found at: {fullPath}");
                        _logger.LogWarning($"Original poster URL: {eventPosterUrl}");
                        _logger.LogWarning($"Poster path after processing: {posterPath}");
                        
                        // Try alternative paths
                        var alternativePaths = new[]
                        {
                            Path.Combine(_env.ContentRootPath, "wwwroot", posterPath),
                            Path.Combine(_env.ContentRootPath, posterPath),
                            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", posterPath),
                            Path.Combine(Directory.GetCurrentDirectory(), posterPath)
                        };
                        
                        foreach (var altPath in alternativePaths)
                        {
                            if (System.IO.File.Exists(altPath))
                            {
                                _logger.LogInformation($"Found poster file at alternative path: {altPath}");
                                posterImageBytes = await System.IO.File.ReadAllBytesAsync(altPath);
                                
                                var extension = Path.GetExtension(altPath).ToLowerInvariant();
                                posterContentType = extension switch
                                {
                                    ".jpg" or ".jpeg" => MediaTypeNames.Image.Jpeg,
                                    ".png" => "image/png",
                                    ".gif" => MediaTypeNames.Image.Gif,
                                    ".webp" => "image/webp",
                                    _ => MediaTypeNames.Image.Jpeg
                                };
                                
                                posterContentId = $"event-poster-{Guid.NewGuid()}";
                                _logger.LogInformation($"Poster image loaded from alternative path. Size: {posterImageBytes.Length} bytes");
                                break;
                            }
                        }
                        
                        // If still not found, try fallback to default poster: wwwroot/massar.jpg
                        if (posterImageBytes == null)
                        {
                            _logger.LogInformation("Poster file not found, trying fallback: massar.jpg");
                            var fallbackPaths = new[]
                            {
                                Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "massar.jpg"),
                                Path.Combine(_env.ContentRootPath, "wwwroot", "massar.jpg"),
                                Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "massar.jpg"),
                                Path.Combine(Directory.GetCurrentDirectory(), "massar.jpg")
                            };
                            
                            foreach (var fallbackPath in fallbackPaths)
                            {
                                if (System.IO.File.Exists(fallbackPath))
                                {
                                    _logger.LogInformation($"Found fallback poster file at: {fallbackPath}");
                                    posterImageBytes = await System.IO.File.ReadAllBytesAsync(fallbackPath);
                                    posterContentType = MediaTypeNames.Image.Jpeg;
                                    posterContentId = $"event-poster-{Guid.NewGuid()}";
                                    _logger.LogInformation($"Fallback poster image loaded. Size: {posterImageBytes.Length} bytes");
                                    break;
                                }
                            }
                            
                            if (posterImageBytes == null)
                            {
                                _logger.LogWarning("Fallback poster file (massar.jpg) also not found");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error reading event poster image. URL: {eventPosterUrl}, Exception: {ex.Message}");
                    
                    // Try fallback even if there was an error
                    try
                    {
                        _logger.LogInformation("Attempting to load fallback poster after error");
                        var fallbackPath = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "massar.jpg");
                        if (System.IO.File.Exists(fallbackPath))
                        {
                            posterImageBytes = await System.IO.File.ReadAllBytesAsync(fallbackPath);
                            posterContentType = MediaTypeNames.Image.Jpeg;
                            posterContentId = $"event-poster-{Guid.NewGuid()}";
                            _logger.LogInformation($"Fallback poster loaded successfully after error. Size: {posterImageBytes.Length} bytes");
                        }
                    }
                    catch (Exception fallbackEx)
                    {
                        _logger.LogError(fallbackEx, "Error loading fallback poster file");
                    }
                }
            }
            else
            {
                _logger.LogInformation("No event poster URL provided, trying fallback: massar.jpg");
                
                // Try to load fallback poster even if no URL provided
                try
                {
                    var fallbackPaths = new[]
                    {
                        Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "massar.jpg"),
                        Path.Combine(_env.ContentRootPath, "wwwroot", "massar.jpg"),
                        Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "massar.jpg"),
                        Path.Combine(Directory.GetCurrentDirectory(), "massar.jpg")
                    };
                    
                    foreach (var fallbackPath in fallbackPaths)
                    {
                        if (System.IO.File.Exists(fallbackPath))
                        {
                            _logger.LogInformation($"Found fallback poster file at: {fallbackPath}");
                            posterImageBytes = await System.IO.File.ReadAllBytesAsync(fallbackPath);
                            posterContentType = MediaTypeNames.Image.Jpeg;
                            posterContentId = $"event-poster-{Guid.NewGuid()}";
                            _logger.LogInformation($"Fallback poster image loaded. Size: {posterImageBytes.Length} bytes");
                            break;
                        }
                    }
                    
                    if (posterImageBytes == null)
                    {
                        _logger.LogWarning("Fallback poster file (massar.jpg) not found");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error loading fallback poster file");
                }
            }

            // Replace placeholders - use cid: reference for inline image
            var posterCid = posterContentId != null ? $"cid:{posterContentId}" : "";
            
            // If no poster, remove the entire poster section from template to avoid broken image
            var body = template;
            if (string.IsNullOrEmpty(posterCid))
            {
                // Remove the poster section if no poster is available
                var posterSectionMarker = "<!-- Header - Event Poster -->";
                var startIndex = body.IndexOf(posterSectionMarker);
                if (startIndex >= 0)
                {
                    // Find the closing </tr> tag after the poster section
                    var trStart = body.IndexOf("<tr>", startIndex);
                    if (trStart >= 0)
                    {
                        var trEnd = body.IndexOf("</tr>", trStart);
                        if (trEnd >= 0)
                        {
                            // Include the newline after </tr> if present
                            var endIndex = trEnd + 5;
                            if (endIndex < body.Length && body[endIndex] == '\n')
                            {
                                endIndex++;
                            }
                            body = body.Remove(startIndex, endIndex - startIndex);
                            _logger.LogInformation("Removed poster section from email template (no poster available)");
                        }
                    }
                }
            }
            
            body = body
                .Replace("{{EVENT_NAME}}", eventName)
                .Replace("{{EVENT_NAME_AR}}", eventNameAr ?? eventName)
                .Replace("{{EVENT_DATE}}", eventDateText)
                .Replace("{{EVENT_DATE_AR}}", eventDateTextAr)
                .Replace("{{EVENT_LOCATION}}", eventLocation ?? "")
                .Replace("{{EVENT_LOCATION_AR}}", eventLocationAr ?? eventLocation ?? "")
                .Replace("{{EVENT_CODE}}", eventCode ?? "")
                .Replace("{{EVENT_URL}}", eventUrl)
                .Replace("{{EVENT_POSTER}}", posterCid)
                .Replace("{{SHARE_LINK}}", shareLink ?? "")
                .Replace("{{YEAR}}", DateTime.Now.Year.ToString());

            var subject = $"Event Registration Confirmed - {eventName}";

            return await SendEmailWithAttachmentAsync(
                to,
                subject,
                body,
                badgeImageBytes,
                $"badge-{barcode}.png",
                "image/png",
                true,
                posterImageBytes,
                posterContentId,
                posterContentType
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send event registration confirmation email to {to}");
            // Fallback to simple email if template not found
            var simpleBody = $"Dear {attendeeName},\n\nYour registration for {eventName} has been confirmed.\n\nYour barcode: {barcode}\n\nPlease find your badge attached.\n\nThank you!";
            return await SendEmailWithAttachmentAsync(
                to,
                $"Event Registration Confirmed - {eventName}",
                simpleBody,
                badgeImageBytes,
                $"badge-{barcode}.png",
                "image/png",
                false
            );
        }
    }

    /// <summary>
    /// Sends event registration successful email (without badge)
    /// </summary>
    public async Task<bool> SendEventRegistrationSuccessfulAsync(
        string to,
        string attendeeName,
        string eventName,
        string? eventNameAr,
        string? eventCode = null,
        string? eventPosterUrl = null)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "event-registration-successful.html");
            var template = await File.ReadAllTextAsync(templatePath);

            // Build event URL: https://otc.moo.gov.kw/events/{eventcode}
            var eventUrl = "";
            if (!string.IsNullOrWhiteSpace(eventCode))
            {
                eventUrl = $"https://otc.moo.gov.kw/events/{eventCode}";
            }
            else
            {
                eventUrl = "https://otc.moo.gov.kw/events";
            }

            // Load event poster image if provided (for inline embedding)
            byte[]? posterImageBytes = null;
            string? posterContentId = null;
            string? posterContentType = null;
            
            if (!string.IsNullOrWhiteSpace(eventPosterUrl))
            {
                try
                {
                    string posterPath = "";
                    
                    // If it's a full URL, try to extract the path
                    if (eventPosterUrl.StartsWith("http://") || eventPosterUrl.StartsWith("https://"))
                    {
                        var uri = new Uri(eventPosterUrl);
                        posterPath = uri.AbsolutePath.TrimStart('/');
                    }
                    else
                    {
                        // Remove leading slash if present
                        posterPath = eventPosterUrl.TrimStart('/');
                    }
                    
                    // Get the full file path
                    string fullPath;
                    if (!string.IsNullOrEmpty(_env.WebRootPath))
                    {
                        fullPath = Path.Combine(_env.WebRootPath, posterPath);
                    }
                    else
                    {
                        var wwwrootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                        fullPath = Path.Combine(wwwrootPath, posterPath);
                    }
                    
                    // Check if file exists
                    if (System.IO.File.Exists(fullPath))
                    {
                        posterImageBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                        
                        // Determine MIME type based on file extension
                        var extension = Path.GetExtension(fullPath).ToLowerInvariant();
                        posterContentType = extension switch
                        {
                            ".jpg" or ".jpeg" => MediaTypeNames.Image.Jpeg,
                            ".png" => "image/png",
                            ".gif" => MediaTypeNames.Image.Gif,
                            ".webp" => "image/webp",
                            _ => MediaTypeNames.Image.Jpeg
                        };
                        
                        posterContentId = $"event-poster-{Guid.NewGuid()}";
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error reading event poster image for registration successful email. URL: {eventPosterUrl}");
                }
            }

            // Replace placeholders - use cid: reference for inline image
            var posterCid = posterContentId != null ? $"cid:{posterContentId}" : "";
            
            // If no poster, remove the entire poster section from template
            var body = template;
            if (string.IsNullOrEmpty(posterCid))
            {
                var posterSectionMarker = "<!-- Header - Event Poster -->";
                var startIndex = body.IndexOf(posterSectionMarker);
                if (startIndex >= 0)
                {
                    var trStart = body.IndexOf("<tr>", startIndex);
                    if (trStart >= 0)
                    {
                        var trEnd = body.IndexOf("</tr>", trStart);
                        if (trEnd >= 0)
                        {
                            var endIndex = trEnd + 5;
                            if (endIndex < body.Length && body[endIndex] == '\n')
                            {
                                endIndex++;
                            }
                            body = body.Remove(startIndex, endIndex - startIndex);
                        }
                    }
                }
            }
            
            body = body
                .Replace("{{EVENT_NAME}}", eventName)
                .Replace("{{EVENT_NAME_AR}}", eventNameAr ?? eventName)
                .Replace("{{EVENT_URL}}", eventUrl)
                .Replace("{{EVENT_POSTER}}", posterCid)
                .Replace("{{YEAR}}", DateTime.Now.Year.ToString());

            var subject = $"Registration Successful - {eventName}";

            return await SendEmailWithAttachmentAsync(
                to,
                subject,
                body,
                null, // No badge attachment
                null,
                null,
                true, // HTML email
                posterImageBytes,
                posterContentId,
                posterContentType
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send event registration successful email to {to}");
            // Fallback to simple email if template not found
            var simpleBody = $"Dear {attendeeName},\n\nThank you for registering for {eventName}.\n\nYour registration request has been received successfully. We will review your application and send you a confirmation email with your badge as soon as possible.\n\nThank you!";
            return await SendEmailAsync(to, $"Registration Successful - {eventName}", simpleBody, false);
        }
    }

    /// <summary>
    /// Sends event registration rejection email
    /// </summary>
    public async Task<bool> SendEventRegistrationRejectedAsync(
        string to,
        string attendeeName,
        string eventName,
        string? eventNameAr,
        string? eventPosterUrl = null)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "event-registration-rejected.html");
            var template = await File.ReadAllTextAsync(templatePath);

            // Load event poster image if provided (for inline embedding)
            byte[]? posterImageBytes = null;
            string? posterContentId = null;
            string? posterContentType = null;
            
            if (!string.IsNullOrWhiteSpace(eventPosterUrl))
            {
                try
                {
                    string posterPath = "";
                    
                    // If it's a full URL, try to extract the path
                    if (eventPosterUrl.StartsWith("http://") || eventPosterUrl.StartsWith("https://"))
                    {
                        var uri = new Uri(eventPosterUrl);
                        posterPath = uri.AbsolutePath.TrimStart('/');
                    }
                    else
                    {
                        // Remove leading slash if present
                        posterPath = eventPosterUrl.TrimStart('/');
                    }
                    
                    // Get the full file path
                    string fullPath;
                    if (!string.IsNullOrEmpty(_env.WebRootPath))
                    {
                        fullPath = Path.Combine(_env.WebRootPath, posterPath);
                    }
                    else
                    {
                        var wwwrootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                        fullPath = Path.Combine(wwwrootPath, posterPath);
                    }
                    
                    // Check if file exists
                    if (System.IO.File.Exists(fullPath))
                    {
                        posterImageBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                        
                        // Determine MIME type based on file extension
                        var extension = Path.GetExtension(fullPath).ToLowerInvariant();
                        posterContentType = extension switch
                        {
                            ".jpg" or ".jpeg" => MediaTypeNames.Image.Jpeg,
                            ".png" => "image/png",
                            ".gif" => MediaTypeNames.Image.Gif,
                            ".webp" => "image/webp",
                            _ => MediaTypeNames.Image.Jpeg
                        };
                        
                        posterContentId = $"event-poster-{Guid.NewGuid()}";
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error reading event poster image for registration rejected email. URL: {eventPosterUrl}");
                }
            }

            // Replace placeholders - use cid: reference for inline image
            var posterCid = posterContentId != null ? $"cid:{posterContentId}" : "";
            
            // If no poster, remove the entire poster section from template
            var body = template;
            if (string.IsNullOrEmpty(posterCid))
            {
                var posterSectionMarker = "<!-- Header - Event Poster -->";
                var startIndex = body.IndexOf(posterSectionMarker);
                if (startIndex >= 0)
                {
                    var trStart = body.IndexOf("<tr>", startIndex);
                    if (trStart >= 0)
                    {
                        var trEnd = body.IndexOf("</tr>", trStart);
                        if (trEnd >= 0)
                        {
                            var endIndex = trEnd + 5;
                            if (endIndex < body.Length && body[endIndex] == '\n')
                            {
                                endIndex++;
                            }
                            body = body.Remove(startIndex, endIndex - startIndex);
                        }
                    }
                }
            }
            
            body = body
                .Replace("{{EVENT_NAME}}", eventName)
                .Replace("{{EVENT_NAME_AR}}", eventNameAr ?? eventName)
                .Replace("{{EVENT_POSTER}}", posterCid)
                .Replace("{{YEAR}}", DateTime.Now.Year.ToString());

            var subject = $"Registration Status - {eventName}";

            return await SendEmailWithAttachmentAsync(
                to,
                subject,
                body,
                null, // No attachment
                null,
                null,
                true, // HTML email
                posterImageBytes,
                posterContentId,
                posterContentType
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send event registration rejected email to {to}");
            // Fallback to simple email if template not found
            var simpleBody = $"Dear {attendeeName},\n\nWe regret to inform you that all available seats for {eventName} have been filled, and we were unable to accept your registration for this edition of the event.\n\nThank you for your understanding.\n\nMinistry of Oil - State of Kuwait";
            return await SendEmailAsync(to, $"Registration Status - {eventName}", simpleBody, false);
        }
    }

    /// <summary>
    /// Sends event final approval email with badge and agenda attachments
    /// </summary>
    public async Task<bool> SendEventFinalApprovalAsync(
        string to,
        string attendeeName,
        string eventName,
        string? eventNameAr,
        DateTime? eventDate,
        string? eventLocation,
        string? eventLocationAr,
        string barcode,
        byte[] badgeImageBytes,
        byte[]? agendaPdfBytes,
        string? agendaFileName,
        string? seatNumber,
        string? shareLink = null,
        string? eventCode = null,
        string? eventPosterUrl = null)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "event-final-approval.html");
            var template = await File.ReadAllTextAsync(templatePath);

            // Format event date - English format: "Monday, 12th January 2026"
            var eventDateText = "TBA";
            if (eventDate.HasValue)
            {
                var date = eventDate.Value;
                var dayName = date.ToString("dddd");
                var day = date.Day;
                var monthName = date.ToString("MMMM");
                var year = date.Year;
                var daySuffix = GetDaySuffix(day);
                eventDateText = $"{dayName}, {day}{daySuffix} {monthName} {year}";
            }

            // Format event date - Arabic format: "الاثنين الموافق 12 يناير 2026م"
            var eventDateTextAr = "سيتم الإعلان لاحقاً";
            if (eventDate.HasValue)
            {
                var date = eventDate.Value;
                var arCulture = new System.Globalization.CultureInfo("ar-KW");
                var dayNameAr = date.ToString("dddd", arCulture);
                var day = date.Day;
                var monthNameAr = date.ToString("MMMM", arCulture);
                var year = date.Year;
                eventDateTextAr = $"{dayNameAr} الموافق {day} {monthNameAr} {year}م";
            }

            // Build event URL: https://otc.moo.gov.kw/events/{eventcode}
            var eventUrl = "";
            if (!string.IsNullOrWhiteSpace(eventCode))
            {
                eventUrl = $"https://otc.moo.gov.kw/events/{eventCode}";
            }
            else
            {
                eventUrl = "https://otc.moo.gov.kw/events";
            }

            // Load event poster image if provided (for inline embedding)
            byte[]? posterImageBytes = null;
            string? posterContentId = null;
            string? posterContentType = null;
            
            if (!string.IsNullOrWhiteSpace(eventPosterUrl))
            {
                try
                {
                    string posterPath = "";
                    
                    if (eventPosterUrl.StartsWith("http://") || eventPosterUrl.StartsWith("https://"))
                    {
                        var uri = new Uri(eventPosterUrl);
                        posterPath = uri.AbsolutePath.TrimStart('/');
                    }
                    else
                    {
                        posterPath = eventPosterUrl.TrimStart('/');
                    }
                    
                    string fullPath;
                    if (!string.IsNullOrEmpty(_env.WebRootPath))
                    {
                        fullPath = Path.Combine(_env.WebRootPath, posterPath);
                    }
                    else
                    {
                        var wwwrootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                        fullPath = Path.Combine(wwwrootPath, posterPath);
                    }
                    
                    if (System.IO.File.Exists(fullPath))
                    {
                        posterImageBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                        
                        var extension = Path.GetExtension(fullPath).ToLowerInvariant();
                        posterContentType = extension switch
                        {
                            ".jpg" or ".jpeg" => MediaTypeNames.Image.Jpeg,
                            ".png" => "image/png",
                            ".gif" => MediaTypeNames.Image.Gif,
                            ".webp" => "image/webp",
                            _ => MediaTypeNames.Image.Jpeg
                        };
                        
                        posterContentId = $"event-poster-{Guid.NewGuid()}";
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error reading event poster image for final approval email. URL: {eventPosterUrl}");
                }
            }

            // Replace placeholders
            var posterCid = posterContentId != null ? $"cid:{posterContentId}" : "";
            
            var body = template;
            if (string.IsNullOrEmpty(posterCid))
            {
                var posterSectionMarker = "<!-- Header - Event Poster -->";
                var startIndex = body.IndexOf(posterSectionMarker);
                if (startIndex >= 0)
                {
                    var trStart = body.IndexOf("<tr>", startIndex);
                    if (trStart >= 0)
                    {
                        var trEnd = body.IndexOf("</tr>", trStart);
                        if (trEnd >= 0)
                        {
                            var endIndex = trEnd + 5;
                            if (endIndex < body.Length && body[endIndex] == '\n')
                            {
                                endIndex++;
                            }
                            body = body.Remove(startIndex, endIndex - startIndex);
                        }
                    }
                }
            }
            
            body = body
                .Replace("{{EVENT_NAME}}", eventName)
                .Replace("{{EVENT_NAME_AR}}", eventNameAr ?? eventName)
                .Replace("{{EVENT_DATE}}", eventDateText)
                .Replace("{{EVENT_DATE_AR}}", eventDateTextAr)
                .Replace("{{EVENT_LOCATION}}", eventLocation ?? "")
                .Replace("{{EVENT_LOCATION_AR}}", eventLocationAr ?? eventLocation ?? "")
                .Replace("{{EVENT_URL}}", eventUrl)
                .Replace("{{EVENT_POSTER}}", posterCid)
                .Replace("{{SEAT_NUMBER}}", seatNumber ?? "TBA")
                .Replace("{{SHARE_LINK}}", shareLink ?? "")
                .Replace("{{YEAR}}", DateTime.Now.Year.ToString());

            var subject = $"Final Approval - {eventName}";

            // Send email with badge and agenda attachments
            return await SendEmailWithMultipleAttachmentsAsync(
                to,
                subject,
                body,
                new List<(byte[] bytes, string fileName, string contentType)>
                {
                    (badgeImageBytes, $"badge-{barcode}.png", "image/png"),
                    (agendaPdfBytes ?? Array.Empty<byte>(), agendaFileName ?? "agenda.pdf", "application/pdf")
                },
                posterImageBytes,
                posterContentId,
                posterContentType
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send event final approval email to {to}");
            // Fallback to simple email
            var simpleBody = $"Dear {attendeeName},\n\nYour registration for {eventName} has been approved.\n\nSeat Number: {seatNumber ?? "TBA"}\n\nPlease find your badge and agenda attached.\n\nThank you!";
            return await SendEmailWithAttachmentAsync(
                to,
                $"Final Approval - {eventName}",
                simpleBody,
                badgeImageBytes,
                $"badge-{barcode}.png",
                "image/png",
                false
            );
        }
    }

    /// <summary>
    /// Sends an email with multiple attachments and inline images
    /// </summary>
    public async Task<bool> SendEmailWithMultipleAttachmentsAsync(
        string to,
        string subject,
        string body,
        List<(byte[] bytes, string fileName, string contentType)> attachments,
        byte[]? inlineImageBytes = null,
        string? inlineImageContentId = null,
        string? inlineImageContentType = null)
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
                IsBodyHtml = true,
                BodyEncoding = Encoding.UTF8,
                SubjectEncoding = Encoding.UTF8
            };

            message.To.Add(to);

            // Create alternate view for HTML body with inline images
            if (inlineImageBytes != null && !string.IsNullOrEmpty(inlineImageContentId))
            {
                var alternateView = AlternateView.CreateAlternateViewFromString(body, null, MediaTypeNames.Text.Html);
                
                var imageStream = new MemoryStream(inlineImageBytes);
                var linkedResource = new LinkedResource(imageStream, inlineImageContentType ?? MediaTypeNames.Image.Jpeg)
                {
                    ContentId = inlineImageContentId
                };
                alternateView.LinkedResources.Add(linkedResource);
                message.AlternateViews.Add(alternateView);
            }

            // Add all attachments
            foreach (var (bytes, fileName, contentType) in attachments)
            {
                if (bytes != null && bytes.Length > 0 && !string.IsNullOrEmpty(fileName) && !string.IsNullOrEmpty(contentType))
                {
                    var attachmentStream = new MemoryStream(bytes);
                    var attachment = new Attachment(attachmentStream, fileName, contentType);
                    message.Attachments.Add(attachment);
                }
            }

            await client.SendMailAsync(message);
            _logger.LogInformation($"Email with multiple attachments sent successfully to {to}");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send email with multiple attachments to {to}");
            return false;
        }
    }

    /// <summary>
    /// Gets the ordinal suffix for a day (1st, 2nd, 3rd, 4th, etc.)
    /// </summary>
    private string GetDaySuffix(int day)
    {
        if (day >= 11 && day <= 13)
        {
            return "th";
        }
        switch (day % 10)
        {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    }

    /// <summary>
    /// Sends course approval confirmation email
    /// </summary>
    public async Task<bool> SendCourseApprovalConfirmationAsync(
        string to,
        string fullName,
        string courseName,
        string? courseDescription,
        DateTime? startDate,
        DateTime? endDate,
        string? location,
        string organizationName,
        EnrollmentType enrollmentType = EnrollmentType.Onsite,
        byte[]? badgeImageBytes = null,
        string? barcode = null,
        string? courseNameAr = null,
        string? courseDescriptionAr = null,
        string? locationAr = null,
        string? courseCode = null)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "course-approval-confirmation.html");
            var template = await File.ReadAllTextAsync(templatePath);

            // Format dates with time (English)
            var startDateText = startDate.HasValue ? startDate.Value.ToString("dddd, MMMM dd, yyyy 'at' hh:mm tt") : "TBA";
            var endDateText = endDate.HasValue ? endDate.Value.ToString("dddd, MMMM dd, yyyy 'at' hh:mm tt") : "TBA";

            // Format dates with time (Arabic)
            var arCulture = new System.Globalization.CultureInfo("ar-KW");
            var startDateTextAr = "سيتم الإعلان لاحقاً";
            var endDateTextAr = "سيتم الإعلان لاحقاً";
            
            if (startDate.HasValue)
            {
                var date = startDate.Value;
                var dayNameAr = date.ToString("dddd", arCulture);
                var day = date.Day;
                var monthNameAr = date.ToString("MMMM", arCulture);
                var year = date.Year;
                var hour = date.Hour;
                var minute = date.Minute;
                var hour12 = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
                var amPm = hour < 12 ? "ص" : "م";
                startDateTextAr = $"{dayNameAr} الموافق {day} {monthNameAr} {year}م الساعة {hour12:D2}:{minute:D2} {amPm}";
            }
            
            if (endDate.HasValue)
            {
                var date = endDate.Value;
                var dayNameAr = date.ToString("dddd", arCulture);
                var day = date.Day;
                var monthNameAr = date.ToString("MMMM", arCulture);
                var year = date.Year;
                var hour = date.Hour;
                var minute = date.Minute;
                var hour12 = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
                var amPm = hour < 12 ? "ص" : "م";
                endDateTextAr = $"{dayNameAr} الموافق {day} {monthNameAr} {year}م الساعة {hour12:D2}:{minute:D2} {amPm}";
            }

            // Get support email from configuration
            var supportEmail = await _configService.GetConfigurationValueAsync("Support:Email") ?? "otc@moo.gov.kw";

            // Generate Google Calendar link
            var calendarLink = GenerateGoogleCalendarLink(
                courseName,
                courseDescription ?? "Course training session",
                location ?? "TBA",
                startDate,
                endDate
            );

            // Load event poster image (course code + .jpg)
            var posterFileName = !string.IsNullOrEmpty(courseCode) ? $"{courseCode}.jpg" : "default.jpg";
            var posterPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", posterFileName);
            byte[]? posterImageBytes = null;
            string? posterContentId = null;
            string? posterContentType = null;

            if (System.IO.File.Exists(posterPath))
            {
                posterImageBytes = await System.IO.File.ReadAllBytesAsync(posterPath);
                posterContentId = "event-poster";
                posterContentType = "image/jpeg";
            }

            // Build conditional messages based on enrollment type (English)
            string onlineMessage = "";
            string onsiteMessage = "";

            // Build conditional messages based on enrollment type (Arabic)
            string onlineMessageAr = "";
            string onsiteMessageAr = "";

            if (enrollmentType == EnrollmentType.Online)
            {
                onlineMessage = @"<div style='background:#e0f2fe;border-left:4px solid #0ea5e9;padding:16px;margin:20px 0;border-radius:4px;'>
                                    <p style='margin:0;color:#0c4a6e;font-weight:600;'>📱 Online Attendance via Microsoft Teams</p>
                                    <p style='margin:8px 0 0;color:#075985;font-size:13px;'>
                                        You will attend this course only via Microsoft Teams. You will receive a Teams meeting invitation soon. 
                                        Please be on time on your laptop to attend the course.
                                    </p>
                                  </div>";
                
                onlineMessageAr = @"<div style='background:#e0f2fe;border-left:4px solid #0ea5e9;padding:16px;margin:20px 0;border-radius:4px;'>
                                      <p style='margin:0;color:#0c4a6e;font-weight:600;'>📱 الحضور عبر Microsoft Teams</p>
                                      <p style='margin:8px 0 0;color:#075985;font-size:13px;'>
                                        ستحضر هذه الدورة التدريبية عبر Microsoft Teams فقط. ستصلك دعوة للاجتماع عبر Teams قريباً. 
                                        يرجى الحضور في الوقت المحدد على جهاز الكمبيوتر المحمول الخاص بك.
                                      </p>
                                    </div>";
            }
            else
            {
                onsiteMessage = @"<div style='background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:20px 0;border-radius:4px;'>
                                    <p style='margin:0;color:#92400e;font-weight:600;'>📍 Onsite Attendance</p>
                                    <p style='margin:8px 0 0;color:#78350f;font-size:13px;'>
                                        Please be at the Ministry of Oil before the course time with at least 30 minutes. 
                                        Your badge with QR code and your name is attached to this email. Please bring it (printed or digital) to the course.
                                    </p>
                                  </div>";
                
                onsiteMessageAr = @"<div style='background:#fef3c7;border-left:4px solid #f59e0b;padding:16px;margin:20px 0;border-radius:4px;'>
                                      <p style='margin:0;color:#92400e;font-weight:600;'>📍 الحضور في الموقع</p>
                                      <p style='margin:8px 0 0;color:#78350f;font-size:13px;'>
                                        يرجى الحضور إلى وزارة النفط قبل وقت الدورة التدريبية بثلاثين دقيقة على الأقل. 
                                        تم إرفاق بطاقتك مع رمز QR واسمك في هذا البريد الإلكتروني. يرجى إحضارها (مطبوعة أو رقمية) إلى الدورة التدريبية.
                                      </p>
                                    </div>";
            }

            // For Arabic placeholders, use provided Arabic versions or fallback to English
            var fullNameAr = fullName; // Could be fetched from User model if available
            var courseNameArValue = !string.IsNullOrWhiteSpace(courseNameAr) ? courseNameAr : courseName;
            var courseDescriptionArValue = !string.IsNullOrWhiteSpace(courseDescriptionAr) ? courseDescriptionAr : (courseDescription ?? "لا يوجد وصف متاح");
            var locationArValue = !string.IsNullOrWhiteSpace(locationAr) ? locationAr : (location ?? "سيتم الإعلان لاحقاً");
            var organizationNameAr = organizationName; // Could be fetched from Organization model if available

            // Prepare attachments
            var attachments = new List<(byte[] bytes, string fileName, string contentType)>();

            // Generate ICS file for calendar invite and create data URI
            string icsDataUri = "#";
            if (startDate.HasValue && endDate.HasValue)
            {
                // Determine location based on enrollment type
                var icsLocation = enrollmentType == EnrollmentType.Online 
                    ? "Microsoft Teams" 
                    : (location ?? "TBA");
                
                var icsContent = GenerateIcsFile(
                    courseName,
                    courseDescription ?? "Course training session",
                    icsLocation,
                    startDate.Value,
                    endDate.Value,
                    fullName,
                    organizationName
                );
                
                if (!string.IsNullOrEmpty(icsContent))
                {
                    var icsBytes = System.Text.Encoding.UTF8.GetBytes(icsContent);
                    var icsFileName = $"course-invite-{courseName.Replace(" ", "-").Replace("/", "-")}.ics";
                    
                    // Add as attachment
                    attachments.Add((icsBytes, icsFileName, "text/calendar"));
                    
                    // Generate data URI for direct download/open in email
                    var base64Ics = Convert.ToBase64String(icsBytes);
                    icsDataUri = $"data:text/calendar;charset=utf-8;base64,{base64Ics}";
                }
            }

            // Add badge attachment for onsite enrollments
            if (enrollmentType == EnrollmentType.Onsite && badgeImageBytes != null && badgeImageBytes.Length > 0)
            {
                var badgeFileName = !string.IsNullOrEmpty(barcode) 
                    ? $"badge-{barcode}.png" 
                    : $"badge-{fullName.Replace(" ", "-")}.png";
                attachments.Add((badgeImageBytes, badgeFileName, "image/png"));
            }

            // Replace placeholders
            var body = template
                .Replace("{{FULL_NAME}}", fullName)
                .Replace("{{FULL_NAME_AR}}", fullNameAr)
                .Replace("{{COURSE_NAME}}", courseName)
                .Replace("{{COURSE_NAME_AR}}", courseNameArValue)
                .Replace("{{COURSE_DESCRIPTION}}", courseDescription ?? "No description available")
                .Replace("{{COURSE_DESCRIPTION_AR}}", courseDescriptionArValue)
                .Replace("{{START_DATE}}", startDateText)
                .Replace("{{START_DATE_AR}}", startDateTextAr)
                .Replace("{{END_DATE}}", endDateText)
                .Replace("{{END_DATE_AR}}", endDateTextAr)
                .Replace("{{COURSE_LOCATION}}", location ?? "TBA")
                .Replace("{{COURSE_LOCATION_AR}}", locationArValue)
                .Replace("{{ORGANIZATION_NAME}}", organizationName)
                .Replace("{{ORGANIZATION_NAME_AR}}", organizationNameAr)
                .Replace("{{SUPPORT_EMAIL}}", supportEmail)
                .Replace("{{CALENDAR_LINK}}", icsDataUri) // Use ICS data URI instead of Google Calendar link
                .Replace("{{ONLINE_MESSAGE}}", onlineMessage)
                .Replace("{{ONLINE_MESSAGE_AR}}", onlineMessageAr)
                .Replace("{{ONSITE_MESSAGE}}", onsiteMessage)
                .Replace("{{ONSITE_MESSAGE_AR}}", onsiteMessageAr)
                .Replace("{{YEAR}}", DateTime.Now.Year.ToString());

            // Replace poster placeholder with CID reference
            if (posterContentId != null)
            {
                body = body.Replace("{{EVENT_POSTER}}", $"cid:{posterContentId}");
            }
            else
            {
                body = body.Replace("{{EVENT_POSTER}}", "");
            }

            var subject = $"Course Approval Confirmation - {courseName}";

            // Send email with attachments and embedded poster
            if (attachments.Any() || posterImageBytes != null)
            {
                return await SendEmailWithMultipleAttachmentsAsync(
                    to,
                    subject,
                    body,
                    attachments,
                    posterImageBytes,
                    posterContentId,
                    posterContentType
                );
            }
            else
            {
                return await SendEmailAsync(to, subject, body, true);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send course approval confirmation email to {to}");
            // Fallback to simple email if template not found
            var simpleBody = $"Dear {fullName},\n\nYour registration for {courseName} has been approved.\n\nThank you!";
            return await SendEmailAsync(to, $"Course Approval Confirmation - {courseName}", simpleBody, false);
        }
    }

    public async Task<bool> SendCourseRescheduledEmailAsync(
        string to,
        string fullName,
        string courseName,
        string? courseDescription,
        DateTime? startDate,
        DateTime? endDate,
        string? location,
        string organizationName)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "course-rescheduled-notification.html");
            var template = await File.ReadAllTextAsync(templatePath);

            // Format dates
            var startDateText = startDate.HasValue ? startDate.Value.ToString("dddd, MMMM dd, yyyy hh:mm tt") : "TBA";
            var endDateText = endDate.HasValue ? endDate.Value.ToString("dddd, MMMM dd, yyyy hh:mm tt") : "TBA";

            // Get support email from configuration
            var supportEmail = await _configService.GetConfigurationValueAsync("Support:Email") ?? "otc@moo.gov.kw";

            // Generate Google Calendar link
            var calendarLink = GenerateGoogleCalendarLink(
                courseName,
                courseDescription ?? "Course training session",
                location ?? "TBA",
                startDate,
                endDate
            );

            // Replace placeholders
            var body = template
                .Replace("{{FULL_NAME}}", fullName)
                .Replace("{{COURSE_NAME}}", courseName)
                .Replace("{{COURSE_DESCRIPTION}}", courseDescription ?? "No description available")
                .Replace("{{START_DATE}}", startDateText)
                .Replace("{{END_DATE}}", endDateText)
                .Replace("{{COURSE_LOCATION}}", location ?? "TBA")
                .Replace("{{ORGANIZATION_NAME}}", organizationName)
                .Replace("{{SUPPORT_EMAIL}}", supportEmail)
                .Replace("{{CALENDAR_LINK}}", calendarLink)
                .Replace("{{YEAR}}", DateTime.Now.Year.ToString());

            var subject = $"Course Rescheduled - {courseName}";

            return await SendEmailAsync(to, subject, body, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send course rescheduled email to {to}");
            // Fallback to simple email if template not found
            var simpleBody = $"Dear {fullName},\n\nThis is to inform you that the schedule for {courseName} has been changed.\n\nNew Schedule:\nStart: {startDate}\nEnd: {endDate}\n\nPlease check the portal for details.\n\nThank you!";
            return await SendEmailAsync(to, $"Course Rescheduled - {courseName}", simpleBody, false);
        }
    }

    /// <summary>
    /// Generates a Google Calendar link for adding an event
    /// This link works with Google Calendar, Outlook.com, and other calendar services
    /// </summary>
    private string GenerateGoogleCalendarLink(
        string title,
        string description,
        string location,
        DateTime? startDate,
        DateTime? endDate)
    {
        if (!startDate.HasValue || !endDate.HasValue)
        {
            return "#"; // Return empty link if dates are not available
        }

        // Format dates in UTC for Google Calendar (yyyyMMddTHHmmssZ)
        var start = startDate.Value.ToUniversalTime().ToString("yyyyMMddTHHmmss") + "Z";
        var end = endDate.Value.ToUniversalTime().ToString("yyyyMMddTHHmmss") + "Z";

        // URL encode parameters
        var encodedTitle = Uri.EscapeDataString(title);
        var encodedDescription = Uri.EscapeDataString(description);
        var encodedLocation = Uri.EscapeDataString(location);

        // Build Google Calendar URL
        var calendarUrl = $"https://calendar.google.com/calendar/render?action=TEMPLATE" +
                         $"&text={encodedTitle}" +
                         $"&dates={start}/{end}" +
                         $"&details={encodedDescription}" +
                         $"&location={encodedLocation}" +
                         $"&sf=true" +
                         $"&output=xml";

        return calendarUrl;
    }

    /// <summary>
    /// Generates an ICS (iCalendar) file content for calendar invite
    /// </summary>
    private string GenerateIcsFile(
        string title,
        string description,
        string location,
        DateTime startDate,
        DateTime endDate,
        string attendeeName,
        string organizerName)
    {
        try
        {
            // Format dates in UTC (ICS format: yyyyMMddTHHmmssZ)
            var startUtc = startDate.ToUniversalTime().ToString("yyyyMMddTHHmmssZ");
            var endUtc = endDate.ToUniversalTime().ToString("yyyyMMddTHHmmssZ");
            var createdUtc = DateTime.UtcNow.ToString("yyyyMMddTHHmmssZ");
            
            // Generate unique UID for the event
            var uid = $"{Guid.NewGuid()}@otc.moo.gov.kw";
            
            // Escape special characters in text fields for ICS format
            var escapeText = new Func<string, string>(text => 
                text?.Replace("\\", "\\\\")
                     .Replace(",", "\\,")
                     .Replace(";", "\\;")
                     .Replace("\n", "\\n")
                     .Replace("\r", "") ?? "");
            
            var escapedTitle = escapeText(title);
            var escapedDescription = escapeText(description);
            var escapedLocation = escapeText(location);
            var escapedOrganizer = escapeText(organizerName);
            
            // Build ICS content
            var icsContent = $@"BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ministry of Oil//Course Management System//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:{uid}
DTSTAMP:{createdUtc}
DTSTART:{startUtc}
DTEND:{endUtc}
SUMMARY:{escapedTitle}
DESCRIPTION:{escapedDescription}
LOCATION:{escapedLocation}
ORGANIZER;CN={escapedOrganizer}:mailto:otc@moo.gov.kw
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT15M
ACTION:DISPLAY
DESCRIPTION:Reminder: {escapedTitle}
END:VALARM
END:VEVENT
END:VCALENDAR";

            return icsContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating ICS file");
            return string.Empty;
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

    /// <summary>
    /// Sends event session enrollment approval email with QR code attachment
    /// </summary>
    public async Task<bool> SendEventSessionEnrollmentApprovalAsync(
        string to,
        string attendeeName,
        string sessionName,
        string? sessionNameAr,
        DateTime? sessionDateTime,
        string? eventName,
        string? eventNameAr,
        string? barcode,
        byte[]? qrCodeBytes,
        string? sessionBannerUrl = null)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "event-session-enrollment-approval.html");
            string template;
            
            if (System.IO.File.Exists(templatePath))
            {
                template = await File.ReadAllTextAsync(templatePath);
            }
            else
            {
                // Fallback template if file doesn't exist
                template = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0b5367; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Session Enrollment Approved</h1>
        </div>
        <div class='content'>
            <p>Dear {{ATTENDEE_NAME}},</p>
            <p>Your enrollment for <strong>{{SESSION_NAME}}</strong> has been approved!</p>
            <p><strong>Session:</strong> {{SESSION_NAME}}</p>
            <p><strong>Date & Time:</strong> {{SESSION_DATE_TIME}}</p>
            <p><strong>Event:</strong> {{EVENT_NAME}}</p>
            <p>We look forward to seeing you at the session!</p>
        </div>
        <div class='footer'>
            <p>Ministry of Oil - Oil Training Center</p>
        </div>
    </div>
</body>
</html>";
            }

            // Get organization name and support email
            var organizationName = await _configService.GetConfigurationValueAsync("Organization:Name") ?? "Ministry of Oil";
            var supportEmail = await _configService.GetConfigurationValueAsync("Support:Email") ?? "support@example.com";

            // Format session date/time
            var sessionDateTimeText = "TBA";
            if (sessionDateTime.HasValue)
            {
                var date = sessionDateTime.Value;
                var dayName = date.ToString("dddd");
                var day = date.Day;
                var monthName = date.ToString("MMMM");
                var year = date.Year;
                var hour = date.ToString("HH:mm");
                var daySuffix = GetDaySuffix(day);
                sessionDateTimeText = $"{dayName}, {day}{daySuffix} {monthName} {year} at {hour}";
            }

            // Generate calendar link
            var calendarLink = GenerateGoogleCalendarLink(
                sessionName,
                $"Session: {sessionName}\nEvent: {eventName ?? "Event"}",
                "TBA",
                sessionDateTime,
                sessionDateTime?.AddHours(2) // Assume 2 hour session
            );

            // Load session banner image if provided (for inline embedding)
            byte[]? bannerImageBytes = null;
            string? bannerContentId = null;
            string? bannerContentType = null;
            string bannerSection = "";
            
            if (!string.IsNullOrWhiteSpace(sessionBannerUrl))
            {
                try
                {
                    string bannerPath = "";
                    
                    // If it's a full URL, try to extract the path
                    if (sessionBannerUrl.StartsWith("http://") || sessionBannerUrl.StartsWith("https://"))
                    {
                        var uri = new Uri(sessionBannerUrl);
                        bannerPath = uri.AbsolutePath.TrimStart('/');
                    }
                    else
                    {
                        // Remove leading slash if present
                        bannerPath = sessionBannerUrl.TrimStart('/');
                    }
                    
                    // Get the full file path
                    string fullPath;
                    if (!string.IsNullOrEmpty(_env.WebRootPath))
                    {
                        fullPath = Path.Combine(_env.WebRootPath, bannerPath);
                    }
                    else
                    {
                        var wwwrootPath = Path.Combine(_env.ContentRootPath, "wwwroot");
                        fullPath = Path.Combine(wwwrootPath, bannerPath);
                    }
                    
                    // Check if file exists
                    if (System.IO.File.Exists(fullPath))
                    {
                        bannerImageBytes = await System.IO.File.ReadAllBytesAsync(fullPath);
                        
                        var extension = Path.GetExtension(fullPath).ToLowerInvariant();
                        bannerContentType = extension switch
                        {
                            ".jpg" or ".jpeg" => MediaTypeNames.Image.Jpeg,
                            ".png" => "image/png",
                            ".gif" => MediaTypeNames.Image.Gif,
                            ".webp" => "image/webp",
                            _ => MediaTypeNames.Image.Jpeg
                        };
                        
                        bannerContentId = $"session-banner-{Guid.NewGuid()}";
                        bannerSection = $"<img src=\"cid:{bannerContentId}\" alt=\"{sessionName}\" style=\"width:100%;max-width:600px;height:auto;display:block;margin:0;\" />";
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Failed to load session banner image: {sessionBannerUrl}");
                }
            }

            // Replace placeholders - handle conditional sections
            var body = template
                .Replace("{{ATTENDEE_NAME}}", attendeeName)
                .Replace("{{SESSION_NAME}}", sessionName)
                .Replace("{{SESSION_NAME_AR}}", sessionNameAr ?? sessionName)
                .Replace("{{SESSION_DATE_TIME}}", sessionDateTimeText)
                .Replace("{{EVENT_NAME}}", eventName ?? "")
                .Replace("{{EVENT_NAME_AR}}", eventNameAr ?? "")
                .Replace("{{BARCODE}}", barcode ?? "")
                .Replace("{{ORGANIZATION_NAME}}", organizationName)
                .Replace("{{SUPPORT_EMAIL}}", supportEmail)
                .Replace("{{CALENDAR_LINK}}", calendarLink)
                .Replace("{{YEAR}}", DateTime.Now.Year.ToString())
                .Replace("{{BANNER_SECTION}}", bannerSection);

            // Handle conditional blocks - remove {{#if}} and {{/if}} markers and conditionally include content
            // Arabic section conditionals
            if (!string.IsNullOrWhiteSpace(sessionNameAr))
            {
                body = System.Text.RegularExpressions.Regex.Replace(
                    body,
                    @"\{\{#if SESSION_NAME_AR\}\}(.*?)\{\{/if\}\}",
                    "$1",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }
            else
            {
                body = System.Text.RegularExpressions.Regex.Replace(
                    body,
                    @"\{\{#if SESSION_NAME_AR\}\}.*?\{\{/if\}\}",
                    "",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }

            if (!string.IsNullOrWhiteSpace(eventNameAr))
            {
                body = System.Text.RegularExpressions.Regex.Replace(
                    body,
                    @"\{\{#if EVENT_NAME_AR\}\}(.*?)\{\{/if\}\}",
                    "$1",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }
            else
            {
                body = System.Text.RegularExpressions.Regex.Replace(
                    body,
                    @"\{\{#if EVENT_NAME_AR\}\}.*?\{\{/if\}\}",
                    "",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }

            if (!string.IsNullOrWhiteSpace(eventName))
            {
                body = System.Text.RegularExpressions.Regex.Replace(
                    body,
                    @"\{\{#if EVENT_NAME\}\}(.*?)\{\{/if\}\}",
                    "$1",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }
            else
            {
                body = System.Text.RegularExpressions.Regex.Replace(
                    body,
                    @"\{\{#if EVENT_NAME\}\}.*?\{\{/if\}\}",
                    "",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }

            if (!string.IsNullOrWhiteSpace(barcode))
            {
                body = System.Text.RegularExpressions.Regex.Replace(
                    body,
                    @"\{\{#if BARCODE\}\}(.*?)\{\{/if\}\}",
                    "$1",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }
            else
            {
                body = System.Text.RegularExpressions.Regex.Replace(
                    body,
                    @"\{\{#if BARCODE\}\}.*?\{\{/if\}\}",
                    "",
                    System.Text.RegularExpressions.RegexOptions.Singleline | System.Text.RegularExpressions.RegexOptions.IgnoreCase
                );
            }

            var subject = $"Session Enrollment Approved - {sessionName}";

            // Send email with banner as inline image if available
            if (bannerImageBytes != null && !string.IsNullOrEmpty(bannerContentId))
            {
                return await SendEmailWithAttachmentAsync(
                    to,
                    subject,
                    body,
                    null, // No attachment
                    null,
                    null,
                    true, // isHtml
                    bannerImageBytes, // inlineImageBytes
                    bannerContentId, // inlineImageContentId
                    bannerContentType ?? MediaTypeNames.Image.Jpeg // inlineImageContentType
                );
            }
            else
            {
                // Send email without banner
                return await SendEmailAsync(to, subject, body, true);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, $"Failed to send session enrollment approval email to {to}");
            return false;
        }
    }
}
