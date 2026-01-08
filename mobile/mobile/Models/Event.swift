import Foundation

struct Event: Codable, Identifiable, Hashable {
    let id: Int?
    let name: String
    let nameAr: String?
    let description: String?
    let descriptionAr: String?
    let code: String
    let poster: String?
    let date: String?
    let published: Bool
    let locationId: Int?
    let location: Location?
    let speakers: [EventSpeaker]?
    let isActive: Bool?
    let registrationCount: Int?
    let createdAt: String?
}

struct Location: Codable, Hashable {
    let id: Int?
    let name: String?
    let nameAr: String?
}

struct EventSpeaker: Codable, Hashable {
    let id: Int?
    let name: String
    let nameAr: String?
}

