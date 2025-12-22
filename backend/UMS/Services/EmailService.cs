using System.Net;
using System.Net.Mail;
using System.Text;
using System.Net.Mime;
using UMS.Interfaces;
using Microsoft.AspNetCore.Hosting;

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

            var subject = $"Final Approval - {eventName} - Seat {seatNumber ?? "TBA"}";

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
        string organizationName)
    {
        try
        {
            var templatePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "templates", "course-approval-confirmation.html");
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

            var subject = $"Course Approval Confirmation - {courseName}";

            return await SendEmailAsync(to, subject, body, true);
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
