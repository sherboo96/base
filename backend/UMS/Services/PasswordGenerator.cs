using System.Linq;

using System.Linq;

namespace UMS.Services;

public class PasswordGenerator
{
    /// <summary>
    /// Generates a temporary password in format MOO@YYYY (e.g., MOO@2025)
    /// </summary>
    /// <param name="length">Not used - kept for backward compatibility</param>
    /// <param name="includeLowercase">Not used - kept for backward compatibility</param>
    /// <param name="includeUppercase">Not used - kept for backward compatibility</param>
    /// <param name="includeDigits">Not used - kept for backward compatibility</param>
    /// <param name="includeSpecial">Not used - kept for backward compatibility</param>
    /// <returns>Generated password in format MOO@YYYY</returns>
    public static string GeneratePassword(
        int length = 12,
        bool includeLowercase = true,
        bool includeUppercase = true,
        bool includeDigits = true,
        bool includeSpecial = true)
    {
        // Generate password in format MOO@YYYY + random suffix (e.g., MOO@2025A3)
        int currentYear = DateTime.Now.Year;
        // Add random alphanumeric suffix (2 characters) to make it unique each time
        var random = new Random();
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        string randomSuffix = new string(Enumerable.Range(0, 2)
            .Select(_ => chars[random.Next(chars.Length)])
            .ToArray());
        return $"MOO@{currentYear}{randomSuffix}";
    }
}
