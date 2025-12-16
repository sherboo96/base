import SwiftUI

@main
struct mobileApp: App {
    @State private var isAuthenticated = false
    @State private var isCheckingAuth = true
    
    init() {
        // Initial check - will be validated in onAppear
        isAuthenticated = APIService.shared.isAuthenticated
    }
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                if isCheckingAuth {
                    // Show loading screen while validating token
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Checking authentication...")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                } else if isAuthenticated {
                    HomeView()
                        .onAppear {
                            // Listen for logout
                            NotificationCenter.default.addObserver(
                                forName: NSNotification.Name("UserLoggedOut"),
                                object: nil,
                                queue: .main
                            ) { _ in
                                isAuthenticated = false
                            }
                        }
                } else {
                    LoginView(isAuthenticated: $isAuthenticated)
                }
            }
            .task {
                // Validate token on app launch
                if APIService.shared.isAuthenticated {
                    let isValid = await APIService.shared.validateToken()
                    await MainActor.run {
                        isAuthenticated = isValid
                        isCheckingAuth = false
                    }
                } else {
                    isCheckingAuth = false
                }
            }
        }
    }
}

