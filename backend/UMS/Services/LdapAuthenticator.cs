using System.DirectoryServices.AccountManagement;

namespace UMS.Services
{
    public class LdapAuthenticator
    {
        private readonly string _domain;

        public LdapAuthenticator(string domain)
        {
            _domain = domain;
        }

        public bool ValidateCredentials(string username, string password)
        {
            using (var context = new PrincipalContext(ContextType.Domain, _domain))
            {
                return context.ValidateCredentials(username, password);
            }
        }

        public string GetFullName(string username)
        {
            using (var context = new PrincipalContext(ContextType.Domain, _domain))
            using (var userPrincipal = UserPrincipal.FindByIdentity(context, username))
            {
                if (userPrincipal != null)
                {
                    return userPrincipal.DisplayName; // Retrieves the full name (display name)
                }
                return null; // Return null if the user is not found
            }
        }

        public AdUserModel? GetUserFromDomain(string username)
        {
            using var context = new PrincipalContext(ContextType.Domain);
            using var userPrincipal = UserPrincipal.FindByIdentity(context, username);

            if (userPrincipal == null) return null;

            return new AdUserModel
            {
                Username = userPrincipal.SamAccountName,
                DisplayName = userPrincipal.DisplayName,
                Title = userPrincipal.Description
            };
        }

        /// <summary>
        /// Checks if the username is related to the domain.
        /// </summary>
        /// <param name="username">The username to check.</param>
        /// <returns>True if the username is found in the domain, otherwise false.</returns>
        public bool IsUsernameInDomain(string username)
        {
            using (var context = new PrincipalContext(ContextType.Domain, _domain))
            using (var userPrincipal = UserPrincipal.FindByIdentity(context, username))
            {
                return userPrincipal != null;
            }
        }
    }
}
