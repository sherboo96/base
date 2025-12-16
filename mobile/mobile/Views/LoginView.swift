import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @Binding var isAuthenticated: Bool
    @State private var isPasswordVisible = false
    
    var body: some View {
        ZStack {
            // Background Gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.95, green: 0.97, blue: 0.98),
                    Color(red: 0.90, green: 0.95, blue: 0.97)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    // Logo and Header Section
                    VStack(spacing: 16) {
                        // Logo
                        Image("logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 120, height: 120)
                            .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                            .padding(.top, 60)
                        
                        // Title
                        VStack(spacing: 8) {
                            Text("Oil Training Center OTC")
                                .font(.system(size: 28, weight: .bold, design: .rounded))
                                .foregroundColor(Color(red: 0.1, green: 0.3, blue: 0.4))
                            
                            Text("Ministry of Oil")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.bottom, 50)
                    
                    // Login Card
                    VStack(spacing: 24) {
                        // Welcome Text
                        VStack(spacing: 8) {
                            Text("Welcome Back")
                                .font(.system(size: 24, weight: .semibold))
                                .foregroundColor(.primary)
                            
                            Text("Sign in to continue")
                                .font(.system(size: 15))
                                .foregroundColor(.secondary)
                        }
                        .padding(.bottom, 8)
                        
                        // Login Form
                        VStack(spacing: 20) {
                            // Username Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Username")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.primary)
                                
                                HStack {
                                    Image(systemName: "person.fill")
                                        .foregroundColor(.gray)
                                        .frame(width: 20)
                                    
                                    TextField("Enter username", text: $viewModel.username)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .autocapitalization(.none)
                                        .autocorrectionDisabled()
                                        .font(.system(size: 16))
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(viewModel.username.isEmpty ? Color.clear : Color.blue.opacity(0.3), lineWidth: 1)
                                )
                            }
                            
                            // Password Field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.primary)
                                
                                HStack {
                                    Image(systemName: "lock.fill")
                                        .foregroundColor(.gray)
                                        .frame(width: 20)
                                    
                                    if isPasswordVisible {
                                        TextField("Enter password", text: $viewModel.password)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .font(.system(size: 16))
                                    } else {
                                        SecureField("Enter password", text: $viewModel.password)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .font(.system(size: 16))
                                    }
                                    
                                    Button(action: {
                                        isPasswordVisible.toggle()
                                    }) {
                                        Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                            .foregroundColor(.gray)
                                            .frame(width: 20)
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.vertical, 14)
                                .background(Color(.systemGray6))
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(viewModel.password.isEmpty ? Color.clear : Color.blue.opacity(0.3), lineWidth: 1)
                                )
                            }
                            
                            // Error Message
                            if let error = viewModel.errorMessage {
                                HStack(spacing: 8) {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .foregroundColor(.red)
                                        .font(.system(size: 14))
                                    
                                    Text(error)
                                        .font(.system(size: 13))
                                        .foregroundColor(.red)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 4)
                            }
                            
                            // Login Button
                            Button(action: {
                                Task {
                                    await viewModel.login()
                                    if viewModel.isAuthenticated {
                                        isAuthenticated = true
                                    }
                                }
                            }) {
                                HStack {
                                    if viewModel.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Text("Login")
                                            .font(.system(size: 17, weight: .semibold))
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .foregroundColor(.white)
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.blue,
                                            Color.blue.opacity(0.8)
                                        ]),
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(12)
                                .shadow(color: Color.blue.opacity(0.3), radius: 8, x: 0, y: 4)
                            }
                            .disabled(viewModel.isLoading || viewModel.username.isEmpty || viewModel.password.isEmpty)
                            .opacity((viewModel.isLoading || viewModel.username.isEmpty || viewModel.password.isEmpty) ? 0.6 : 1.0)
                            .padding(.top, 8)
                        }
                    }
                    .padding(.horizontal, 32)
                    .padding(.vertical, 32)
                    .background(Color(.systemBackground))
                    .cornerRadius(24)
                    .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                    .padding(.horizontal, 24)
                    .padding(.bottom, 40)
                }
            }
        }
    }
}

class LoginViewModel: ObservableObject {
    @Published var username = ""
    @Published var password = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var isAuthenticated = false
    
    func login() async {
        await MainActor.run {
            isLoading = true
            errorMessage = nil
        }
        
        do {
            let loginResponse = try await APIService.shared.login(username: username, password: password)
            await MainActor.run {
                // Login successful - token is already stored in APIService
                isAuthenticated = true
                isLoading = false
                errorMessage = nil
            }
        } catch {
            await MainActor.run {
                // Extract error message from API error
                if let apiError = error as? APIError {
                    errorMessage = apiError.errorDescription
                } else {
                    errorMessage = error.localizedDescription
                }
                isLoading = false
            }
        }
    }
}
