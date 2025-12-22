import Foundation
import SwiftUI

struct Config {
    static let baseURL = "https://otc.moo.gov.kw/api/api"
    
    static var apiURL: String {
        return baseURL
    }
}

// System Colors from Tailwind Config
extension Color {
    // Primary colors
    static let systemPrimary = Color(hex: "#0F4C75")
    
    // Accent colors (main brand color)
    static let systemAccent = Color(hex: "#0B5367")
    static let systemAccentLight = Color(hex: "#0D6B7F")
    static let systemAccentDark = Color(hex: "#084354")
    static let systemAccentDarker = Color(hex: "#063240")
    
    // Text color
    static let systemTextDark = Color(hex: "#2E3A3F")
}

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
