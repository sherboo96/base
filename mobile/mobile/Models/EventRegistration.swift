import Foundation

enum EventRegistrationStatus: String, Codable {
    case draft = "Draft"
    case approved = "Approved"
    case rejected = "Rejected"
}

enum VipStatus: Int, Codable {
    case attendee = 0
    case vip = 1
    case vVip = 2
}

struct EventRegistration: Codable, Identifiable {
    let id: Int?
    let name: String
    let nameAr: String?
    let phone: String
    let email: String
    let jobTitle: String?
    let barcode: String?
    let seatNumber: String?
    let status: EventRegistrationStatus?
    let emailSent: Bool?
    let emailSentAt: String?
    let registrationSuccessfulEmailSent: Bool?
    let registrationSuccessfulEmailSentAt: String?
    let confirmationEmailSent: Bool?
    let confirmationEmailSentAt: String?
    let finalApprovalEmailSent: Bool?
    let finalApprovalEmailSentAt: String?
    let eventId: Int
    let event: Event?
    let eventOrganizationId: Int?
    let eventOrganization: EventOrganization?
    let attendees: [EventAttendee]?
    let vipStatus: VipStatus?
    let isManual: Bool?
    let isActive: Bool?
    let createdAt: String?
    let createdBy: String?
    let updatedAt: String?
    let updatedBy: String?
    
    // Computed property to get latest check-in status
    var latestCheckIn: EventAttendee? {
        return attendees?.filter { $0.checkInDateTime != nil }
            .sorted { ($0.checkInDateTime ?? "") > ($1.checkInDateTime ?? "") }
            .first
    }
    
    var isCheckedIn: Bool {
        return latestCheckIn?.checkInDateTime != nil
    }
    
    var isCheckedOut: Bool {
        return latestCheckIn?.checkOutDateTime != nil
    }
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case nameAr
        case phone
        case email
        case jobTitle
        case barcode
        case seatNumber
        case status
        case emailSent
        case emailSentAt
        case registrationSuccessfulEmailSent
        case registrationSuccessfulEmailSentAt
        case confirmationEmailSent
        case confirmationEmailSentAt
        case finalApprovalEmailSent
        case finalApprovalEmailSentAt
        case eventId
        case event
        case eventOrganizationId
        case eventOrganization
        case attendees
        case vipStatus
        case isManual
        case isActive
        case createdAt
        case createdBy
        case updatedAt
        case updatedBy
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        id = try container.decodeIfPresent(Int.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        nameAr = try container.decodeIfPresent(String.self, forKey: .nameAr)
        phone = try container.decode(String.self, forKey: .phone)
        email = try container.decode(String.self, forKey: .email)
        jobTitle = try container.decodeIfPresent(String.self, forKey: .jobTitle)
        barcode = try container.decodeIfPresent(String.self, forKey: .barcode)
        seatNumber = try container.decodeIfPresent(String.self, forKey: .seatNumber)
        status = try container.decodeIfPresent(EventRegistrationStatus.self, forKey: .status)
        emailSent = try container.decodeIfPresent(Bool.self, forKey: .emailSent)
        emailSentAt = try container.decodeIfPresent(String.self, forKey: .emailSentAt)
        registrationSuccessfulEmailSent = try container.decodeIfPresent(Bool.self, forKey: .registrationSuccessfulEmailSent)
        registrationSuccessfulEmailSentAt = try container.decodeIfPresent(String.self, forKey: .registrationSuccessfulEmailSentAt)
        confirmationEmailSent = try container.decodeIfPresent(Bool.self, forKey: .confirmationEmailSent)
        confirmationEmailSentAt = try container.decodeIfPresent(String.self, forKey: .confirmationEmailSentAt)
        finalApprovalEmailSent = try container.decodeIfPresent(Bool.self, forKey: .finalApprovalEmailSent)
        finalApprovalEmailSentAt = try container.decodeIfPresent(String.self, forKey: .finalApprovalEmailSentAt)
        eventId = try container.decode(Int.self, forKey: .eventId)
        event = try container.decodeIfPresent(Event.self, forKey: .event)
        eventOrganizationId = try container.decodeIfPresent(Int.self, forKey: .eventOrganizationId)
        eventOrganization = try container.decodeIfPresent(EventOrganization.self, forKey: .eventOrganization)
        attendees = try container.decodeIfPresent([EventAttendee].self, forKey: .attendees)
        
        // Handle vipStatus - Backend uses JsonStringEnumConverter, so it sends as String
        // Decode as String and convert to VipStatus enum
        if container.contains(.vipStatus) {
            if try container.decodeNil(forKey: .vipStatus) {
                vipStatus = nil
            } else {
                // Backend sends enum as String (e.g., "Attendee", "Vip", "VVip") due to JsonStringEnumConverter
                do {
                    let stringValue = try container.decode(String.self, forKey: .vipStatus)
                    let trimmed = stringValue.trimmingCharacters(in: .whitespaces)
                    switch trimmed {
                    case "Attendee", "attendee", "0":
                        vipStatus = .attendee
                    case "Vip", "VIP", "vip", "1":
                        vipStatus = .vip
                    case "VVip", "VVIP", "vvip", "2":
                        vipStatus = .vVip
                    default:
                        // If string doesn't match, try to parse as Int as fallback
                        if let intValue = Int(trimmed) {
                            vipStatus = VipStatus(rawValue: intValue) ?? .attendee
                        } else {
                            print("⚠️ Warning: Unknown vipStatus value '\(stringValue)'. Defaulting to attendee.")
                            vipStatus = .attendee
                        }
                    }
                } catch {
                    // If String decoding fails, default to attendee
                    // Note: Can't try Int here because container is consumed
                    print("⚠️ Warning: Failed to decode vipStatus as String: \(error). Defaulting to attendee.")
                    vipStatus = .attendee
                }
            }
        } else {
            vipStatus = nil
        }
        
        isManual = try container.decodeIfPresent(Bool.self, forKey: .isManual)
        isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive)
        createdAt = try container.decodeIfPresent(String.self, forKey: .createdAt)
        createdBy = try container.decodeIfPresent(String.self, forKey: .createdBy)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
        updatedBy = try container.decodeIfPresent(String.self, forKey: .updatedBy)
    }
}

struct EventOrganization: Codable {
    let id: Int?
    let name: String
    let nameAr: String?
}

struct EventAttendee: Codable {
    let id: Int?
    let eventRegistrationId: Int
    let checkInDateTime: String?
    let checkOutDateTime: String?
}

struct CheckInRequest: Codable {
    let barcode: String
}

struct CheckOutRequest: Codable {
    let barcode: String
}

