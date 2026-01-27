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
                        
                        Text("Loading...")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.systemTextDark)
                    }
                } else if viewModel.events.isEmpty && viewModel.courses.isEmpty && viewModel.coursesLoadError == nil {
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
                            Text("No Events or Courses")
                                .font(.system(size: 26, weight: .bold))
                                .foregroundColor(.systemTextDark)
                            
                            Text("There are no active events or courses for check-in at the moment.\nCheck back when a course or event is within its scan window.")
                                .font(.system(size: 16))
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)
                                .padding(.horizontal, 40)
                            
                            Text("Tip: Courses need Status=Active; events need published=true. On a physical device, use your computer's IP instead of localhost.")
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 32)
                                .padding(.top, 8)
                            
                            Button(action: {
                                Task { await viewModel.loadData() }
                            }) {
                                HStack(spacing: 8) {
                                    Image(systemName: "arrow.clockwise")
                                    Text("Refresh")
                                        .font(.system(size: 16, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .padding(.horizontal, 24)
                                .padding(.vertical, 12)
                                .background(
                                    LinearGradient(
                                        gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    )
                                )
                                .cornerRadius(12)
                            }
                            .padding(.top, 16)
                        }
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Active Events Section
                            if !viewModel.events.isEmpty {
                                VStack(alignment: .leading, spacing: 16) {
                                    // Events Header Card
                                    ZStack {
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                        .cornerRadius(20)
                                        
                                        HStack(alignment: .top, spacing: 16) {
                                            VStack(alignment: .leading, spacing: 8) {
                                                Text("Active Events")
                                                    .font(.system(size: 22, weight: .bold))
                                                    .foregroundColor(.white)
                                                
                                                HStack(spacing: 8) {
                                                    Image(systemName: "calendar.badge.clock")
                                                        .font(.system(size: 14, weight: .semibold))
                                                    Text("\(viewModel.events.count) event\(viewModel.events.count == 1 ? "" : "s")")
                                                        .font(.system(size: 14, weight: .medium))
                                                }
                                                .foregroundColor(.white.opacity(0.9))
                                                .padding(.horizontal, 10)
                                                .padding(.vertical, 5)
                                                .background(Color.white.opacity(0.2))
                                                .cornerRadius(10)
                                            }
                                            Spacer()
                                        }
                                        .padding(20)
                                    }
                                    .frame(height: 100)
                                    .shadow(color: Color.systemAccent.opacity(0.3), radius: 10, x: 0, y: 4)
                                    
                                    LazyVStack(spacing: 16) {
                                        ForEach(Array(viewModel.events.enumerated()), id: \.element.id) { _, event in
                                            NavigationLink(destination: EventRegistrationsView(event: event)) {
                                                EventCardView(event: event)
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                        }
                                    }
                                }
                                .padding(.horizontal, 16)
                            }
                            
                            // Active Courses Section
                            if !viewModel.courses.isEmpty || viewModel.coursesLoadError != nil {
                                VStack(alignment: .leading, spacing: 16) {
                                    ZStack {
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        )
                                        .cornerRadius(20)
                                        
                                        HStack(alignment: .top, spacing: 16) {
                                            VStack(alignment: .leading, spacing: 8) {
                                                Text("Active Courses")
                                                    .font(.system(size: 22, weight: .bold))
                                                    .foregroundColor(.white)
                                                
                                                HStack(spacing: 8) {
                                                    Image(systemName: "book.closed.fill")
                                                        .font(.system(size: 14, weight: .semibold))
                                                    Text(viewModel.courses.isEmpty && viewModel.coursesLoadError != nil ? "Error" : "\(viewModel.courses.count) course\(viewModel.courses.count == 1 ? "" : "s")")
                                                        .font(.system(size: 14, weight: .medium))
                                                }
                                                .foregroundColor(.white.opacity(0.9))
                                                .padding(.horizontal, 10)
                                                .padding(.vertical, 5)
                                                .background(Color.white.opacity(0.2))
                                                .cornerRadius(10)
                                            }
                                            Spacer()
                                        }
                                        .padding(20)
                                    }
                                    .frame(height: 100)
                                    .shadow(color: Color.systemAccent.opacity(0.3), radius: 10, x: 0, y: 4)
                                    
                                    if let err = viewModel.coursesLoadError, viewModel.courses.isEmpty {
                                        Text(err)
                                            .font(.system(size: 14))
                                            .foregroundColor(.secondary)
                                            .multilineTextAlignment(.center)
                                            .padding(20)
                                        Text("Pull to refresh.")
                                            .font(.system(size: 13))
                                            .foregroundColor(.systemAccent)
                                    } else {
                                        LazyVStack(spacing: 16) {
                                            ForEach(viewModel.courses) { course in
                                                NavigationLink(destination: CourseAttendanceView(course: course)) {
                                                    CourseCardView(course: course)
                                                }
                                                .buttonStyle(PlainButtonStyle())
                                            }
                                        }
                                    }
                                }
                                .padding(.horizontal, 16)
                            }
                        }
                        .padding(.top, 12)
                        .padding(.bottom, 100)
                    }
                    .refreshable {
                        await viewModel.loadData()
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
                await viewModel.loadData()
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
                        
                        // Registration Count (without main organization)
                        if let registrationCount = event.registrationCount {
                            HStack(spacing: 14) {
                                ZStack {
                                    Circle()
                                        .fill(
                                            LinearGradient(
                                                gradient: Gradient(colors: [Color.blue.opacity(0.15), Color.blue.opacity(0.05)]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .frame(width: 40, height: 40)
                                    
                                    Image(systemName: "person.3.fill")
                                        .font(.system(size: 16, weight: .semibold))
                                        .foregroundColor(.blue)
                                }
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Registrations")
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundColor(.secondary)
                                    
                                    Text("\(registrationCount) registered")
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

// MARK: - Course Card (for Active Courses / attendance)
struct CourseCardView: View {
    let course: CourseForAttendance
    @State private var isPressed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 0) {
                LinearGradient(
                    gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentLight]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(width: 5)
                .cornerRadius(2)

                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(course.courseTitle)
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.systemTextDark)
                            .lineLimit(2)
                        Spacer()
                        HStack(spacing: 4) {
                            Circle().fill(Color.green).frame(width: 8, height: 8)
                            Text("Active").font(.system(size: 12, weight: .semibold)).foregroundColor(.green)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(12)
                    }
                    if let ar = course.courseTitleAr, !ar.isEmpty {
                        Text(ar).font(.system(size: 15, weight: .medium)).foregroundColor(.secondary).lineLimit(2)
                    }
                    Rectangle()
                        .fill(LinearGradient(gradient: Gradient(colors: [Color.systemAccent.opacity(0.3), Color.systemAccent.opacity(0.1), Color.clear]), startPoint: .leading, endPoint: .trailing))
                        .frame(height: 1)
                        .padding(.vertical, 10)
                    VStack(spacing: 10) {
                        if let start = course.startDateTime {
                            row(icon: "calendar", label: "Start", value: formatDate(start))
                        }
                        if let end = course.endDateTime {
                            row(icon: "clock", label: "End", value: formatDate(end))
                        }
                        if let loc = course.locationName ?? course.locationNameAr, !loc.isEmpty {
                            row(icon: "location.fill", label: "Location", value: loc, iconColor: .red)
                        }
                        row(icon: "barcode", label: "Code", value: course.code, iconColor: .purple)
                    }
                    HStack {
                        Spacer()
                        HStack(spacing: 8) {
                            Text("Check-In / Out").font(.system(size: 14, weight: .bold))
                            Image(systemName: "qrcode.viewfinder").font(.system(size: 14, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(LinearGradient(gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]), startPoint: .leading, endPoint: .trailing))
                        .cornerRadius(12)
                    }
                    .padding(.top, 12)
                }
                .padding(20)
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(18)
        .shadow(color: Color.black.opacity(isPressed ? 0.15 : 0.08), radius: isPressed ? 12 : 10, x: 0, y: isPressed ? 6 : 4)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(LinearGradient(gradient: Gradient(colors: [Color.systemAccent.opacity(0.2), Color.systemAccent.opacity(0.05)]), startPoint: .topLeading, endPoint: .bottomTrailing), lineWidth: 1))
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isPressed)
    }

    private func row(icon: String, label: String, value: String, iconColor: Color = .systemAccent) -> some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(LinearGradient(gradient: Gradient(colors: [iconColor.opacity(0.15), iconColor.opacity(0.05)]), startPoint: .topLeading, endPoint: .bottomTrailing))
                    .frame(width: 40, height: 40)
                Image(systemName: icon).font(.system(size: 16, weight: .semibold)).foregroundColor(iconColor)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(label).font(.system(size: 12, weight: .medium)).foregroundColor(.secondary)
                Text(value).font(.system(size: 15, weight: .semibold)).foregroundColor(.primary).lineLimit(2)
            }
            Spacer()
        }
    }

    private func formatDate(_ s: String) -> String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var d = f.date(from: s)
        if d == nil { f.formatOptions = [.withInternetDateTime]; d = f.date(from: s) }
        guard let d = d else { return s }
        let out = DateFormatter()
        out.dateFormat = "MMM dd, hh:mm a"
        return out.string(from: d)
    }
}

class HomeViewModel: ObservableObject {
    @Published var events: [Event] = []
    @Published var courses: [CourseForAttendance] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var coursesLoadError: String?

    func loadData() async {
        await MainActor.run { isLoading = true; coursesLoadError = nil; errorMessage = nil }
        var loadedEvents: [Event] = []
        var loadedCourses: [CourseForAttendance] = []
        do {
            loadedEvents = try await APIService.shared.getActiveEvents()
        } catch {
            await MainActor.run { errorMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription }
        }
        do {
            loadedCourses = try await APIService.shared.getActiveCoursesForAttendance()
        } catch {
            await MainActor.run { coursesLoadError = (error as? APIError)?.errorDescription ?? error.localizedDescription }
        }
        await MainActor.run {
            events = loadedEvents
            courses = loadedCourses
            isLoading = false
        }
    }
}
