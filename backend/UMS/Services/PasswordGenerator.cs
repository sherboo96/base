using System.Security.Cryptography;
using System.Text;

namespace UMS.Services;

public class PasswordGenerator
{
    private const string LowercaseChars = "abcdefghijklmnopqrstuvwxyz";
    private const string UppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private const string DigitChars = "0123456789";
    private const string SpecialChars = "!@#$%^&*()_-+=<>?";

    /// <summary>
    /// Generates a secure random password
    /// </summary>
    /// <param name="length">Length of the password (default: 12)</param>
    /// <param name="includeLowercase">Include lowercase letters</param>
    /// <param name="includeUppercase">Include uppercase letters</param>
    /// <param name="includeDigits">Include digits</param>
    /// <param name="includeSpecial">Include special characters</param>
    /// <returns>Generated password</returns>
    public static string GeneratePassword(
        int length = 12,
        bool includeLowercase = true,
        bool includeUppercase = true,
        bool includeDigits = true,
        bool includeSpecial = true)
    {
        if (length < 8)
        {
            throw new ArgumentException("Password length must be at least 8 characters");
        }

        var charSet = new StringBuilder();
        var password = new StringBuilder();

        // Build character set based on requirements
        if (includeLowercase) charSet.Append(LowercaseChars);
        if (includeUppercase) charSet.Append(UppercaseChars);
        if (includeDigits) charSet.Append(DigitChars);
        if (includeSpecial) charSet.Append(SpecialChars);

        if (charSet.Length == 0)
        {
            throw new ArgumentException("At least one character type must be included");
        }

        // Ensure at least one character from each required type
        if (includeLowercase) password.Append(LowercaseChars[RandomNumberGenerator.GetInt32(LowercaseChars.Length)]);
        if (includeUppercase) password.Append(UppercaseChars[RandomNumberGenerator.GetInt32(UppercaseChars.Length)]);
        if (includeDigits) password.Append(DigitChars[RandomNumberGenerator.GetInt32(DigitChars.Length)]);
        if (includeSpecial) password.Append(SpecialChars[RandomNumberGenerator.GetInt32(SpecialChars.Length)]);

        // Fill the rest randomly
        for (int i = password.Length; i < length; i++)
        {
            password.Append(charSet[RandomNumberGenerator.GetInt32(charSet.Length)]);
        }

        // Shuffle the password to avoid predictable patterns
        return Shuffle(password.ToString());
    }

    private static string Shuffle(string input)
    {
        var array = input.ToCharArray();
        int n = array.Length;
        
        for (int i = n - 1; i > 0; i--)
        {
            int j = RandomNumberGenerator.GetInt32(i + 1);
            // Swap
            (array[i], array[j]) = (array[j], array[i]);
        }
        
        return new string(array);
    }
}
