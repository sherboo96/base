import Foundation

struct BaseResponse<T: Codable>: Codable {
    let statusCode: Int
    let message: String
    let result: T?
    let total: Int?
    let pagination: Pagination?
}

struct Pagination: Codable {
    let currentPage: Int?
    let pageSize: Int?
    let total: Int?
}

