import Foundation

struct BaseResponse<T: Codable>: Codable {
    let statusCode: Int
    let message: String
    let result: T?
}

