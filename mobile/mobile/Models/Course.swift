import Foundation

/// Lightweight model for courses in the mobile attendance (check-in/check-out) view.
struct CourseForAttendance: Codable, Identifiable {
    let id: Int
    let name: String
    let nameAr: String?
    let code: String
    let courseTitle: String
    let courseTitleAr: String?
    let startDateTime: String?
    let endDateTime: String?
    let locationId: Int?
    let locationName: String?
    let locationNameAr: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case nameAr
        case code
        case courseTitle
        case courseTitleAr
        case startDateTime
        case endDateTime
        case locationId
        case locationName
        case locationNameAr
    }
}

/// A single course attendance record from GET /api/CourseAttendance/course/{courseId}
struct CourseAttendanceRecord: Codable, Identifiable {
    let id: Int
    let courseEnrollmentId: Int
    let studentName: String
    let organizationName: String?
    let checkInTime: String?
    let checkOutTime: String?
    let durationMinutes: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case courseEnrollmentId
        case studentName
        case organizationName
        case checkInTime
        case checkOutTime
        case durationMinutes
    }
}

/// Onsite enrollment for mobile attendance view: all enrollments with latest check-in/out for manual check-in and filter by organization.
struct CourseEnrollmentForAttendance: Codable, Identifiable {
    let id: Int
    let studentName: String
    let organizationId: Int?
    let organizationName: String?
    let barcode: String?  // {courseId}_{userId} for search-by-scan
    let checkInTime: String?
    let checkOutTime: String?
    let isCheckedIn: Bool

    enum CodingKeys: String, CodingKey {
        case id
        case studentName
        case organizationId
        case organizationName
        case barcode
        case checkInTime
        case checkOutTime
        case isCheckedIn
    }
}
