import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var animateGradient = false
    @State private var showLogoutConfirmation = false
    
    var body: some View {
        NavigationView {
            ZStack {
                // Animated Gradient Background
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color.systemAccent.opacity(0.05),
                        Color.systemAccentLight.opacity(0.03),
                        Color(.systemGroupedBackground)
                    ]),
                    startPoint: animateGradient ? .topLeading : .bottomLeading,
                    endPoint: animateGradient ? .bottomTrailing : .topTrailing
                )
                .ignoresSafeArea()
                .onAppear {
                    withAnimation(.easeInOut(duration: 3.0).repeatForever(autoreverses: true)) {
                        animateGradient.toggle()
                    }
                }
                
                if viewModel.isLoading {
                    VStack(spacing: 20) {
                        ZStack {
                            Circle()
                                .stroke(Color.systemAccent.opacity(0.2), lineWidth: 4)
                                .frame(width: 60, height: 60)
                            
                            Circle()
                                .trim(from: 0, to: 0.7)
                                .stroke(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentLight]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    style: StrokeStyle(lineWidth: 4, lineCap: .round)
                                )
                                .frame(width: 60, height: 60)
                                .rotationEffect(.degrees(-90))
                                .animation(.linear(duration: 1).repeatForever(autoreverses: false), value: viewModel.isLoading)
                        }
                        
                        Text("Loading events...")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.systemTextDark)
                    }
                } else if viewModel.events.isEmpty {
                    VStack(spacing: 24) {
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.systemAccent.opacity(0.1), Color.systemAccentLight.opacity(0.05)]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 120, height: 120)
                            
                            Image(systemName: "calendar.badge.exclamationmark")
                                .font(.system(size: 50, weight: .light))
                                .foregroundColor(.systemAccent)
                        }
                        
                        VStack(spacing: 12) {
                            Text("No Events")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(.systemTextDark)
                            
                            Text("There are no published events at the moment.\nCheck back soon for upcoming events!")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)
                                .padding(.horizontal, 40)
                        }
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 20) {
                            // Premium Header Card
                            ZStack {
                                // Gradient Background
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                                .cornerRadius(20)
                                
                                // Pattern Overlay
                                GeometryReader { geometry in
                                    Path { path in
                                        let width = geometry.size.width
                                        let height = geometry.size.height
                                        path.move(to: CGPoint(x: width * 0.7, y: 0))
                                        path.addQuadCurve(
                                            to: CGPoint(x: width, y: height * 0.3),
                                            control: CGPoint(x: width * 0.9, y: height * 0.1)
                                        )
                                        path.addLine(to: CGPoint(x: width, y: 0))
                                        path.closeSubpath()
                                    }
                                    .fill(Color.white.opacity(0.1))
                                }
                                .cornerRadius(20)
                                
                                HStack(alignment: .top, spacing: 16) {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text("Active Events")
                                            .font(.system(size: 32, weight: .bold))
                                            .foregroundColor(.white)
                                        
                                        HStack(spacing: 8) {
                                            Image(systemName: "calendar.badge.clock")
                                                .font(.system(size: 14, weight: .semibold))
                                            
                                            Text("\(viewModel.events.count) event\(viewModel.events.count == 1 ? "" : "s") available")
                                                .font(.system(size: 16, weight: .medium))
                                        }
                                        .foregroundColor(.white.opacity(0.9))
                                        .padding(.horizontal, 12)
                                        .padding(.vertical, 6)
                                        .background(Color.white.opacity(0.2))
                                        .cornerRadius(12)
                                    }
                                    
                                    Spacer()
                                    
                                    // Logo with glow effect
                                    Image("logo")
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 60, height: 60)
                                        .clipShape(Circle())
                                        .overlay(Circle().stroke(Color.white.opacity(0.3), lineWidth: 2))
                                        .shadow(color: Color.white.opacity(0.3), radius: 10, x: 0, y: 0)
                                }
                                .padding(24)
                            }
                            .frame(height: 140)
                            .shadow(color: Color.systemAccent.opacity(0.3), radius: 15, x: 0, y: 8)
                            .padding(.horizontal, 16)
                            .padding(.top, 12)
                            
                            // Events List
                            LazyVStack(spacing: 16) {
                                ForEach(Array(viewModel.events.enumerated()), id: \.element.id) { index, event in
                                    NavigationLink(destination: EventRegistrationsView(event: event)) {
                                        EventCardView(event: event)
                                            .transition(.asymmetric(
                                                insertion: .scale.combined(with: .opacity),
                                                removal: .opacity
                                            ))
                                    }
                                    .buttonStyle(PlainButtonStyle())
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 100)
                        }
                        .padding(.top, 8)
                    }
                    .refreshable {
                        await viewModel.loadEvents()
                    }
                    .overlay(
                        // Floating Logout Button
                        VStack {
                            Spacer()
                            HStack {
                                Spacer()
                                Button(action: {
                                    showLogoutConfirmation = true
                                }) {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                        .font(.system(size: 22, weight: .bold))
                                        .foregroundColor(.white)
                                        .frame(width: 60, height: 60)
                                        .background(
                                            LinearGradient(
                                                gradient: Gradient(colors: [Color.red, Color.red.opacity(0.8)]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .clipShape(Circle())
                                        .shadow(color: Color.red.opacity(0.4), radius: 12, x: 0, y: 6)
                                        .overlay(
                                            Circle()
                                                .stroke(Color.white, lineWidth: 3)
                                        )
                                }
                                .padding(.trailing, 20)
                                .padding(.bottom, 20)
                            }
                        }
                        , alignment: .bottomTrailing
                    )
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Confirm Logout", isPresented: $showLogoutConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Logout", role: .destructive) {
                    APIService.shared.logout()
                    NotificationCenter.default.post(name: NSNotification.Name("UserLoggedOut"), object: nil)
                }
            } message: {
                Text("Are you sure you want to log out?")
            }
            .task {
                await viewModel.loadEvents()
            }
        }
    }
}


struct EventCardView: View {
    let event: Event
    @State private var isPressed = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with gradient accent
            HStack(spacing: 0) {
                // Gradient side accent
                LinearGradient(
                    gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentLight]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(width: 5)
                .cornerRadius(2)
                
                VStack(alignment: .leading, spacing: 10) {
                    // Event Name Section
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(event.name)
                                .font(.system(size: 22, weight: .bold))
                                .foregroundColor(.systemTextDark)
                                .lineLimit(2)
                            
                            Spacer()
                            
                            // Status Badge
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(Color.green)
                                    .frame(width: 8, height: 8)
                                
                                Text("Active")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.green)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(12)
                        }
                        
                        if let nameAr = event.nameAr, !nameAr.isEmpty {
                            Text(nameAr)
                                .font(.system(size: 17, weight: .medium))
                                .foregroundColor(.secondary)
                                .lineLimit(2)
                        }
                    }
                    
                    // Divider with gradient
                    Rectangle()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.systemAccent.opacity(0.3),
                                    Color.systemAccent.opacity(0.1),
                                    Color.clear
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(height: 1)
                        .padding(.vertical, 12)
                    
                    // Event Details Grid
                    VStack(spacing: 14) {
                        if let date = event.date {
                            HStack(spacing: 14) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                gradient: Gradient(colors: [Color.systemAccent.opacity(0.15), Color.systemAccent.opacity(0.05)]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 40, height: 40)
                                    
                                    Image(systemName: "calendar")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.systemAccent)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Event Date")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
                                    Text(formatDate(date))
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(.primary)
                                }
                                
                                Spacer()
                            }
                        }
                        
                        if let location = event.location?.name {
                            HStack(spacing: 14) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                gradient: Gradient(colors: [Color.red.opacity(0.15), Color.red.opacity(0.05)]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 40, height: 40)
                                    
                                    Image(systemName: "location.fill")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.red)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Location")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
                                    Text(location)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(.primary)
                                        .lineLimit(2)
                                }
                                
                                Spacer()
                            }
                        }
                        
                        if let code = event.code as String? {
                            HStack(spacing: 14) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                gradient: Gradient(colors: [Color.purple.opacity(0.15), Color.purple.opacity(0.05)]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 40, height: 40)
                                    
                                    Image(systemName: "barcode")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.purple)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Event Code")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
                                    Text(code)
                                        .font(.system(size: 15, weight: .semibold))
                                        .foregroundColor(.primary)
                                }
                                
                                Spacer()
                            }
                        }
                    }
                    
                    // Action Footer
                    HStack {
                        Spacer()
                        
                        HStack(spacing: 8) {
                            Text("View Registrations")
                                .font(.system(size: 15, weight: .bold))
                            
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 12)
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .cornerRadius(12)
                        .shadow(color: Color.systemAccent.opacity(0.4), radius: 8, x: 0, y: 4)
                    }
                    .padding(.top, 16)
                }
                .padding(20)
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(18)
        .shadow(color: Color.black.opacity(isPressed ? 0.15 : 0.08), radius: isPressed ? 12 : 10, x: 0, y: isPressed ? 6 : 4)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.systemAccent.opacity(0.2),
                            Color.systemAccent.opacity(0.05)
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
    }
    
    private func formatDate(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        var date: Date?
        if let parsedDate = formatter.date(from: dateString) {
            date = parsedDate
        } else {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: dateString)
        }
        
        guard let date = date else {
            return dateString
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "MMM dd, yyyy • hh:mm a"
        
        return displayFormatter.string(from: date)
    }
}


class HomeViewModel: ObservableObject {
    @Published var events: [Event] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    func loadEvents() async {
        await MainActor.run {
            isLoading = true
        }
        
        do {
            let loadedEvents = try await APIService.shared.getActiveEvents()
            await MainActor.run {
                events = loadedEvents
                isLoading = false
                errorMessage = nil
            }
        } catch {
            await MainActor.run {
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
