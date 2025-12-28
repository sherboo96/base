using System.Linq;

namespace UMS.Services;

public class PasswordGenerator
{
    /// <summary>
    /// Generates a temporary password in format {OrgCode}@{YYYY}{3 random lowercase alphanumeric chars}
    /// Example: MOO@2025a3b
    /// </summary>
    /// <param name="organizationCode">Organization code (e.g., "MOO")</param>
    /// <param name="length">Not used - kept for backward compatibility</param>
    /// <param name="includeLowercase">Not used - kept for backward compatibility</param>
    /// <param name="includeUppercase">Not used - kept for backward compatibility</param>
    /// <param name="includeDigits">Not used - kept for backward compatibility</param>
    /// <param name="includeSpecial">Not used - kept for backward compatibility</param>
    /// <returns>Generated password in format {OrgCode}@{YYYY}{3 random lowercase alphanumeric chars}</returns>
    public static string GeneratePassword(
        string organizationCode,
        int length = 12,
        bool includeLowercase = true,
        bool includeUppercase = true,
        bool includeDigits = true,
        bool includeSpecial = true)
    {
        // Generate password in format {OrgCode}@{YYYY}{3 random lowercase alphanumeric chars}
        int currentYear = DateTime.Now.Year;
        // Add 3 random lowercase alphanumeric characters (lowercase letters and numbers)
        var random = new Random();
        const string chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        string randomSuffix = new string(Enumerable.Range(0, 3)
            .Select(_ => chars[random.Next(chars.Length)])
            .ToArray());
        return $"{organizationCode}@{currentYear}{randomSuffix}";
    }
}
