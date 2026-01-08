import SwiftUI

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @Binding var isAuthenticated: Bool
    @State private var isPasswordVisible = false
    @State private var animateGradient = false
    
    var body: some View {
        ZStack {
            // Animated Background Gradient with System Colors
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.systemAccent.opacity(0.15),
                    Color.systemAccentLight.opacity(0.08),
                    Color.white
                ]),
                startPoint: animateGradient ? .topLeading : .bottomLeading,
                endPoint: animateGradient ? .bottomTrailing : .topTrailing
            )
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.easeInOut(duration: 4.0).repeatForever(autoreverses: true)) {
                    animateGradient.toggle()
                }
            }
            
            // Decorative Pattern Overlay
            GeometryReader { geometry in
                Path { path in
                    let width = geometry.size.width
                    let height = geometry.size.height
                    
                    // Top right curve
                    path.move(to: CGPoint(x: width * 0.6, y: 0))
                    path.addQuadCurve(
                        to: CGPoint(x: width, y: height * 0.4),
                        control: CGPoint(x: width * 0.9, y: height * 0.15)
                    )
                    path.addLine(to: CGPoint(x: width, y: 0))
                    path.closeSubpath()
                }
                .fill(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.systemAccent.opacity(0.1),
                            Color.systemAccent.opacity(0.05)
                        ]),
                        startPoint: .topTrailing,
                        endPoint: .bottomLeading
                    )
                )
            }
            .ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    // Logo and Header Section
                    VStack(spacing: 20) {
                        // Logo with glow effect
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.systemAccent.opacity(0.2),
                                            Color.systemAccentLight.opacity(0.1)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 140, height: 140)
                                .blur(radius: 20)
                            
                            Image("logo")
                                .resizable()
                                .scaledToFit()
                                .frame(width: 120, height: 120)
                                .clipShape(Circle())
                                .overlay(
                                    Circle()
                                        .stroke(
                                            LinearGradient(
                                                gradient: Gradient(colors: [
                                                    Color.systemAccent.opacity(0.3),
                                                    Color.systemAccentLight.opacity(0.2)
                                                ]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            ),
                                            lineWidth: 3
                                        )
                                )
                                .shadow(color: Color.systemAccent.opacity(0.2), radius: 15, x: 0, y: 8)
                        }
                        .padding(.top, 60)
                        
                        // Title
                        VStack(spacing: 10) {
                            Text("Oil Training Center")
                                .font(.system(size: 30, weight: .bold, design: .rounded))
                                .foregroundColor(.systemTextDark)
                            
                            Text("Ministry of Oil")
                                .font(.system(size: 17, weight: .medium))
                                .foregroundColor(.systemAccent)
                        }
                    }
                    .padding(.bottom, 50)
                    
                    // Login Card
                    VStack(spacing: 28) {
                        // Welcome Text
                        VStack(spacing: 10) {
                            Text("Welcome Back")
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(.systemTextDark)
                            
                            Text("Sign in to continue")
                                .font(.system(size: 16, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        .padding(.bottom, 8)
                        
                        // Login Form
                        VStack(spacing: 22) {
                            // Username Field
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Username")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.systemTextDark)
                                
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.systemAccent.opacity(0.1))
                                            .frame(width: 32, height: 32)
                                        
                                        Image(systemName: "person.fill")
                                            .foregroundColor(.systemAccent)
                                            .font(.system(size: 13, weight: .semibold))
                                    }
                                    
                                    TextField("Enter username", text: $viewModel.username)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .autocapitalization(.none)
                                        .autocorrectionDisabled()
                                        .font(.system(size: 15, weight: .medium))
                                        .foregroundColor(.systemTextDark)
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(Color.white)
                                .cornerRadius(14)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(
                                            LinearGradient(
                                                gradient: Gradient(colors: viewModel.username.isEmpty
                                                    ? [Color.gray.opacity(0.2), Color.gray.opacity(0.2)]
                                                    : [Color.systemAccent, Color.systemAccentLight]),
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            ),
                                            lineWidth: 2
                                        )
                                )
                                .shadow(color: viewModel.username.isEmpty ? Color.clear : Color.systemAccent.opacity(0.1), radius: 8, x: 0, y: 4)
                            }
                            
                            // Password Field
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Password")
                                    .font(.system(size: 15, weight: .semibold))
                                    .foregroundColor(.systemTextDark)
                                
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.systemAccent.opacity(0.1))
                                            .frame(width: 32, height: 32)
                                        
                                        Image(systemName: "lock.fill")
                                            .foregroundColor(.systemAccent)
                                            .font(.system(size: 13, weight: .semibold))
                                    }
                                    
                                    if isPasswordVisible {
                                        TextField("Enter password", text: $viewModel.password)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .font(.system(size: 15, weight: .medium))
                                            .foregroundColor(.systemTextDark)
                                    } else {
                                        SecureField("Enter password", text: $viewModel.password)
                                            .textFieldStyle(PlainTextFieldStyle())
                                            .font(.system(size: 15, weight: .medium))
                                            .foregroundColor(.systemTextDark)
                                    }
                                    
                                    Button(action: {
                                        isPasswordVisible.toggle()
                                    }) {
                                        ZStack {
                                            Circle()
                                                .fill(Color.systemAccent.opacity(0.1))
                                                .frame(width: 32, height: 32)
                                            
                                            Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                                                .foregroundColor(.systemAccent)
                                                .font(.system(size: 13, weight: .semibold))
                                        }
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 12)
                                .background(Color.white)
                                .cornerRadius(14)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(
                                            LinearGradient(
                                                gradient: Gradient(colors: viewModel.password.isEmpty
                                                    ? [Color.gray.opacity(0.2), Color.gray.opacity(0.2)]
                                                    : [Color.systemAccent, Color.systemAccentLight]),
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            ),
                                            lineWidth: 2
                                        )
                                )
                                .shadow(color: viewModel.password.isEmpty ? Color.clear : Color.systemAccent.opacity(0.1), radius: 8, x: 0, y: 4)
                            }
                            
                            // Error Message
                            if let error = viewModel.errorMessage {
                                HStack(spacing: 10) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .foregroundColor(.red)
                                        .font(.system(size: 16))
                                    
                                    Text(error)
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.red)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 12)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(12)
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
                                HStack(spacing: 12) {
                                    if viewModel.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    } else {
                                        Image(systemName: "arrow.right.circle.fill")
                                            .font(.system(size: 20, weight: .semibold))
                                        
                                        Text("Login")
                                            .font(.system(size: 18, weight: .bold))
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 56)
                                .foregroundColor(.white)
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.systemAccent,
                                            Color.systemAccentDark
                                        ]),
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(14)
                                .shadow(color: Color.systemAccent.opacity(0.4), radius: 12, x: 0, y: 6)
                            }
                            .disabled(viewModel.isLoading || viewModel.username.isEmpty || viewModel.password.isEmpty)
                            .opacity((viewModel.isLoading || viewModel.username.isEmpty || viewModel.password.isEmpty) ? 0.5 : 1.0)
                            .padding(.top, 12)
                        }
                    }
                    .padding(.horizontal, 32)
                    .padding(.vertical, 36)
                    .background(
                        RoundedRectangle(cornerRadius: 28)
                            .fill(Color(.systemBackground))
                            .shadow(color: Color.systemAccent.opacity(0.15), radius: 25, x: 0, y: 12)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 28)
                            .stroke(
                                LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color.systemAccent.opacity(0.2),
                                        Color.systemAccentLight.opacity(0.1)
                                    ]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ),
                                lineWidth: 1
                            )
                    )
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
            _ = try await APIService.shared.login(username: username, password: password)
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
