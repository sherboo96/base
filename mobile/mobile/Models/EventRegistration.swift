import Foundation

enum EventRegistrationStatus: String, Codable {
    case draft = "Draft"
    case approved = "Approved"
    case rejected = "Rejected"
}

struct EventRegistration: Codable, Identifiable {
    let id: Int?
    let name: String
    let nameAr: String?
    let phone: String
    let email: String
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

