import Foundation

class APIService {
    static let shared = APIService()
    
    private let baseURL = Config.apiURL
    private var token: String? {
        return UserDefaults.standard.string(forKey: "auth_token")
    }
    
    private init() {}
    
    private func createRequest(url: URL, method: String, body: Data? = nil) -> URLRequest {
        var request = URLRequest(url: url)
        request.httpMethod = method
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        return request
    }
    
    func login(username: String, password: String, system: Int = 1) async throws -> LoginResponse {
        let url = URL(string: "\(baseURL)/Authentications/login")!
        let requestBody = LoginRequest(username: username, password: password, system: system)
        let body = try JSONEncoder().encode(requestBody)
        
        let request = createRequest(url: url, method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        // Handle non-200 status codes
        if httpResponse.statusCode != 200 {
            // Try to decode error response
            if let errorResponse = try? JSONDecoder().decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.httpError(httpResponse.statusCode)
            }
        }
        
        // Decode response
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let baseResponse = try decoder.decode(BaseResponse<LoginResponse>.self, from: data)
        
        guard let result = baseResponse.result else {
            throw APIError.serverError(baseResponse.message)
        }
        
        // Store token and user info
        UserDefaults.standard.set(result.token, forKey: "auth_token")
        
        // Store user info for quick access
        if let userData = try? JSONEncoder().encode(result.user) {
            UserDefaults.standard.set(userData, forKey: "user_info")
        }
        
        return result
    }
    
    func getActiveEvents() async throws -> [Event] {
        let url = URL(string: "\(baseURL)/Events?published=true&page=1&pageSize=100")!
        let request = createRequest(url: url, method: "GET")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if let errorResponse = try? JSONDecoder().decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.httpError(httpResponse.statusCode)
            }
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let baseResponse = try decoder.decode(BaseResponse<[Event]>.self, from: data)

        return baseResponse.result ?? []
    }

    // MARK: - Active Courses for Attendance (check-in/check-out by QR)

    func getActiveCoursesForAttendance() async throws -> [CourseForAttendance] {
        let url = URL(string: "\(baseURL)/Courses/active-for-attendance")!
        let request = createRequest(url: url, method: "GET")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if let errorResponse = try? JSONDecoder().decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.httpError(httpResponse.statusCode)
            }
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let baseResponse = try decoder.decode(BaseResponse<[CourseForAttendance]>.self, from: data)
        return baseResponse.result ?? []
    }

    func getCourseAttendance(courseId: Int) async throws -> [CourseAttendanceRecord] {
        let url = URL(string: "\(baseURL)/CourseAttendance/course/\(courseId)")!
        let request = createRequest(url: url, method: "GET")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if let errorResponse = try? JSONDecoder().decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.httpError(httpResponse.statusCode)
            }
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let baseResponse = try decoder.decode(BaseResponse<[CourseAttendanceRecord]>.self, from: data)
        return baseResponse.result ?? []
    }

    /// All approved onsite enrollments for a course, with latest check-in/out. For mobile attendance with search and filter by organization.
    func getCourseEnrollmentsForAttendance(courseId: Int) async throws -> [CourseEnrollmentForAttendance] {
        let url = URL(string: "\(baseURL)/CourseAttendance/course/\(courseId)/enrollments")!
        let request = createRequest(url: url, method: "GET")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            if let errorResponse = try? JSONDecoder().decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.httpError(httpResponse.statusCode)
            }
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let baseResponse = try decoder.decode(BaseResponse<[CourseEnrollmentForAttendance]>.self, from: data)
        return baseResponse.result ?? []
    }

    func courseManualCheckIn(enrollmentId: Int) async throws {
        let url = URL(string: "\(baseURL)/CourseAttendance/check-in/\(enrollmentId)")!
        let request = createRequest(url: url, method: "POST")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            if let err = try? decoder.decode(BaseResponse<Bool>.self, from: data), !err.message.isEmpty {
                throw APIError.serverError(err.message)
            }
            throw APIError.serverError("Check-in failed")
        }
    }

    func courseManualCheckOut(enrollmentId: Int) async throws {
        let url = URL(string: "\(baseURL)/CourseAttendance/check-out/\(enrollmentId)")!
        let request = createRequest(url: url, method: "POST")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            if let err = try? decoder.decode(BaseResponse<Bool>.self, from: data), !err.message.isEmpty {
                throw APIError.serverError(err.message)
            }
            throw APIError.serverError("Check-out failed")
        }
    }

    func courseCheckIn(barcode: String) async throws {
        let url = URL(string: "\(baseURL)/CourseAttendance/checkin-by-barcode")!
        let requestBody = ["barcode": barcode]
        let body = try JSONSerialization.data(withJSONObject: requestBody)

        let request = createRequest(url: url, method: "POST", body: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            if let err = try? decoder.decode(BaseResponse<Bool>.self, from: data), !err.message.isEmpty {
                throw APIError.serverError(err.message)
            }
            throw APIError.serverError("Check-in failed")
        }
    }

    func courseCheckOut(barcode: String) async throws {
        let url = URL(string: "\(baseURL)/CourseAttendance/checkout-by-barcode")!
        let requestBody = ["barcode": barcode]
        let body = try JSONSerialization.data(withJSONObject: requestBody)

        let request = createRequest(url: url, method: "POST", body: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            if let err = try? decoder.decode(BaseResponse<Bool>.self, from: data), !err.message.isEmpty {
                throw APIError.serverError(err.message)
            }
            throw APIError.serverError("Check-out failed")
        }
    }
    
    func getEventRegistrations(eventId: Int) async throws -> [EventRegistration] {
        let url = URL(string: "\(baseURL)/EventRegistrations?eventId=\(eventId)&page=1&pageSize=1000")!
        let request = createRequest(url: url, method: "GET")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            if let errorResponse = try? decoder.decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                let errorString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw APIError.serverError("HTTP \(httpResponse.statusCode): \(errorString)")
            }
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        do {
            let baseResponse = try decoder.decode(BaseResponse<[EventRegistration]>.self, from: data)
            
            // Return all registrations (not just approved)
            guard let registrations = baseResponse.result else {
                throw APIError.serverError("No registrations in response")
            }
            
            return registrations
        } catch let decodingError as DecodingError {
            let errorDescription: String
            switch decodingError {
            case .typeMismatch(let type, let context):
                errorDescription = "Type mismatch for type \(type) at path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))"
            case .valueNotFound(let type, let context):
                errorDescription = "Value not found for type \(type) at path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))"
            case .keyNotFound(let key, let context):
                errorDescription = "Key '\(key.stringValue)' not found at path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))"
            case .dataCorrupted(let context):
                errorDescription = "Data corrupted at path: \(context.codingPath.map { $0.stringValue }.joined(separator: ".")) - \(context.debugDescription)"
            @unknown default:
                errorDescription = "Unknown decoding error: \(decodingError.localizedDescription)"
            }
            let jsonString = String(data: data, encoding: .utf8) ?? "Unable to convert to string"
            throw APIError.serverError("Decoding error: \(errorDescription)\nResponse: \(jsonString.prefix(500))")
        }
    }
    
    func checkIn(barcode: String) async throws -> EventAttendee {
        let url = URL(string: "\(baseURL)/EventAttendees/checkin")!
        let requestBody = CheckInRequest(barcode: barcode)
        let body = try JSONEncoder().encode(requestBody)
        
        let request = createRequest(url: url, method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            if let errorResponse = try? decoder.decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.serverError("Check-in failed")
            }
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let baseResponse = try decoder.decode(BaseResponse<EventAttendee>.self, from: data)
        
        guard let result = baseResponse.result else {
            throw APIError.invalidResponse
        }
        
        return result
    }
    
    func checkOut(barcode: String) async throws -> EventAttendee {
        let url = URL(string: "\(baseURL)/EventAttendees/checkout")!
        let requestBody = CheckOutRequest(barcode: barcode)
        let body = try JSONEncoder().encode(requestBody)
        
        let request = createRequest(url: url, method: "POST", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            if let errorResponse = try? decoder.decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.serverError("Check-out failed")
            }
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let baseResponse = try decoder.decode(BaseResponse<EventAttendee>.self, from: data)
        
        guard let result = baseResponse.result else {
            throw APIError.invalidResponse
        }
        
        return result
    }
    
    // Approve registration
    func approveRegistration(id: Int) async throws -> EventRegistration {
        let url = URL(string: "\(baseURL)/EventRegistrations/\(id)/approve")!
        let request = createRequest(url: url, method: "POST")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            if let errorResponse = try? decoder.decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.serverError("Approval failed")
            }
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let baseResponse = try decoder.decode(BaseResponse<EventRegistration>.self, from: data)
        
        guard let result = baseResponse.result else {
            throw APIError.invalidResponse
        }
        
        return result
    }
    
    // Reject registration
    func rejectRegistration(id: Int) async throws -> EventRegistration {
        let url = URL(string: "\(baseURL)/EventRegistrations/\(id)/reject")!
        let request = createRequest(url: url, method: "POST")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            if let errorResponse = try? decoder.decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.serverError("Rejection failed")
            }
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let baseResponse = try decoder.decode(BaseResponse<EventRegistration>.self, from: data)
        
        guard let result = baseResponse.result else {
            throw APIError.invalidResponse
        }
        
        return result
    }
    
    // Update seat number
    func updateSeatNumber(id: Int, seatNumber: String?) async throws -> EventRegistration {
        let url = URL(string: "\(baseURL)/EventRegistrations/\(id)/seat-number")!
        let requestBody = ["seatNumber": seatNumber ?? ""]
        let body = try JSONSerialization.data(withJSONObject: requestBody)
        
        let request = createRequest(url: url, method: "PUT", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            if let errorResponse = try? decoder.decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.serverError("Seat number update failed")
            }
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let baseResponse = try decoder.decode(BaseResponse<EventRegistration>.self, from: data)
        
        guard let result = baseResponse.result else {
            throw APIError.invalidResponse
        }
        
        return result
    }
    
    // Send final approval email
    func sendFinalApprovalEmail(id: Int) async throws -> EventRegistration {
        let url = URL(string: "\(baseURL)/EventRegistrations/\(id)/send-final-approval")!
        let request = createRequest(url: url, method: "POST")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            if let errorResponse = try? decoder.decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.serverError("Failed to send final approval email")
            }
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let baseResponse = try decoder.decode(BaseResponse<EventRegistration>.self, from: data)
        
        guard let result = baseResponse.result else {
            throw APIError.invalidResponse
        }
        
        return result
    }
    
    // Update registration (for VIP status and other fields)
    func updateRegistration(id: Int, vipStatus: VipStatus) async throws -> EventRegistration {
        let url = URL(string: "\(baseURL)/EventRegistrations/\(id)")!
        let requestBody: [String: Any] = ["vipStatus": vipStatus.rawValue]
        let body = try JSONSerialization.data(withJSONObject: requestBody)
        
        let request = createRequest(url: url, method: "PUT", body: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            let decoder = JSONDecoder()
            if let errorResponse = try? decoder.decode(BaseResponse<String>.self, from: data) {
                throw APIError.serverError(errorResponse.message)
            } else {
                throw APIError.serverError("Failed to update registration")
            }
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        
        let baseResponse = try decoder.decode(BaseResponse<EventRegistration>.self, from: data)
        
        guard let result = baseResponse.result else {
            throw APIError.invalidResponse
        }
        
        return result
    }
    
    func logout() {
        UserDefaults.standard.removeObject(forKey: "auth_token")
        UserDefaults.standard.removeObject(forKey: "user_info")
    }
    
    var isAuthenticated: Bool {
        return token != nil
    }
    
    // Validate token by making a test API call
    func validateToken() async -> Bool {
        guard token != nil else {
            return false
        }
        
        // Try to fetch events as a validation check
        do {
            let url = URL(string: "\(baseURL)/Events?published=true&page=1&pageSize=1")!
            let request = createRequest(url: url, method: "GET")
            
            let (_, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return false
            }
            
            // If we get 401, token is invalid/expired
            if httpResponse.statusCode == 401 {
                logout()
                return false
            }
            
            // If we get 200, token is valid
            return httpResponse.statusCode == 200
        } catch {
            // If there's an error, assume token is invalid
            logout()
            return false
        }
    }
}

enum APIError: Error, LocalizedError {
    case invalidResponse
    case httpError(Int)
    case serverError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "HTTP Error: \(code)"
        case .serverError(let message):
            return message
        }
    }
}

