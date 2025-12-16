import Foundation

struct LoginUser: Codable {
    let id: String
    let fullName: String
    let lastLogin: String?
    let loginMethod: LoginMethod?
    let organization: LoginOrganization?
    let createdOn: String?
}

struct LoginMethod: Codable {
    let id: Int
    let name: String
}

struct LoginOrganization: Codable {
    let id: Int?
    let name: String?
    let nameAr: String?
}

struct LoginRole: Codable {
    let id: Int?
    let name: String?
}

struct LoginResponse: Codable {
    let token: String
    let user: LoginUser
    let roles: [LoginRole]?
}

struct LoginRequest: Codable {
    let username: String
    let password: String
    let system: Int
}

