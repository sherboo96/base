import SwiftUI

struct CourseAttendanceView: View {
    let course: CourseForAttendance
    @StateObject private var viewModel = CourseAttendanceViewModel()
    @State private var showQRScanner = false
    @State private var showScanOptions = false
    @State private var scanMode: CourseScanMode = .checkIn
    @State private var isScanningEnabled = false
    @State private var animateGradient = false
    @State private var searchText = ""
    @State private var selectedOrganizationId: Int? = nil
    @State private var isOrganizationFilterExpanded = false
    @State private var showQRScannerForSearch = false
    @State private var showManualCheckInOutConfirmation = false
    @State private var pendingManualEnrollment: CourseEnrollmentForAttendance? = nil
    @State private var pendingManualIsCheckIn = true

    enum CourseScanMode {
        case checkIn
        case checkOut
    }

    private var availableOrganizations: [(id: Int, name: String)] {
        var seen = Set<Int>()
        return viewModel.enrollments.compactMap { e -> (id: Int, name: String)? in
            guard let id = e.organizationId, let name = e.organizationName, !name.isEmpty, !seen.contains(id) else { return nil }
            seen.insert(id)
            return (id, name)
        }.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    private var filteredEnrollments: [CourseEnrollmentForAttendance] {
        var list = viewModel.enrollments
        if !searchText.isEmpty {
            let q = searchText.trimmingCharacters(in: .whitespaces).lowercased()
            list = list.filter {
                $0.studentName.lowercased().contains(q) ||
                ($0.organizationName?.lowercased().contains(q) ?? false) ||
                ($0.barcode?.lowercased().contains(q) ?? false)
            }
        }
        if let id = selectedOrganizationId {
            list = list.filter { $0.organizationId == id }
        }
        return list
    }

    var body: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [Color.systemAccent.opacity(0.05), Color.systemAccentLight.opacity(0.03), Color(.systemGroupedBackground)]),
                startPoint: animateGradient ? .topLeading : .bottomLeading,
                endPoint: animateGradient ? .bottomTrailing : .topTrailing
            )
            .ignoresSafeArea()
            .onAppear { withAnimation(.easeInOut(duration: 3.0).repeatForever(autoreverses: true)) { animateGradient.toggle() } }

            if viewModel.isLoading {
                VStack(spacing: 20) {
                    ProgressView().scaleEffect(1.5)
                    Text("Loading enrollments...").font(.system(size: 17, weight: .semibold)).foregroundColor(.systemTextDark)
                }
            } else {
                VStack(spacing: 0) {
                    // Search and filter
                    VStack(spacing: 12) {
                        HStack(spacing: 10) {
                            HStack(spacing: 10) {
                                Image(systemName: "magnifyingglass").foregroundColor(.systemAccent).font(.system(size: 14, weight: .semibold))
                                TextField("Search by name, organization, or scan QR...", text: $searchText)
                                    .textFieldStyle(PlainTextFieldStyle())
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.systemTextDark)
                                if !searchText.isEmpty {
                                    Button(action: { searchText = "" }) {
                                        Image(systemName: "xmark.circle.fill").foregroundColor(.systemAccent).font(.system(size: 16))
                                    }
                                }
                            }
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(Color(.systemBackground))
                            .cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.systemAccent.opacity(searchText.isEmpty ? 0.2 : 0.5), lineWidth: 1))
                            Button(action: { showQRScannerForSearch = true }) {
                                Image(systemName: "qrcode.viewfinder")
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(.white)
                                    .frame(width: 44, height: 44)
                                    .background(LinearGradient(gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]), startPoint: .topLeading, endPoint: .bottomTrailing))
                                    .cornerRadius(12)
                                    .shadow(color: Color.systemAccent.opacity(0.4), radius: 6, x: 0, y: 3)
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 12)

                        if !availableOrganizations.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                Button(action: { withAnimation(.easeInOut(duration: 0.2)) { isOrganizationFilterExpanded.toggle() } }) {
                                    HStack {
                                        Text("Filter by Organization").font(.system(size: 14, weight: .bold)).foregroundColor(.systemTextDark)
                                        Spacer()
                                        Image(systemName: isOrganizationFilterExpanded ? "chevron.up" : "chevron.down")
                                            .font(.system(size: 12, weight: .semibold)).foregroundColor(.systemAccent)
                                    }
                                    .padding(.horizontal, 16)
                                }
                                if isOrganizationFilterExpanded {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 10) {
                                            Button(action: { selectedOrganizationId = nil }) {
                                                HStack(spacing: 6) {
                                                    if selectedOrganizationId == nil { Image(systemName: "checkmark").font(.system(size: 12, weight: .bold)) }
                                                    Text("All").font(.system(size: 14, weight: .bold))
                                                }
                                                .foregroundColor(selectedOrganizationId == nil ? .white : .systemAccent)
                                                .padding(.horizontal, 14)
                                                .padding(.vertical, 8)
                                                .background(selectedOrganizationId == nil ? Color.systemAccent : Color.systemAccent.opacity(0.1))
                                                .cornerRadius(10)
                                            }
                                            ForEach(availableOrganizations, id: \.id) { org in
                                                Button(action: { selectedOrganizationId = org.id }) {
                                                    HStack(spacing: 6) {
                                                        if selectedOrganizationId == org.id { Image(systemName: "checkmark").font(.system(size: 12, weight: .bold)) }
                                                        Text(org.name).font(.system(size: 14, weight: .bold)).lineLimit(1)
                                                    }
                                                    .foregroundColor(selectedOrganizationId == org.id ? .white : .systemAccent)
                                                    .padding(.horizontal, 14)
                                                    .padding(.vertical, 8)
                                                    .background(selectedOrganizationId == org.id ? Color.systemAccent : Color.systemAccent.opacity(0.1))
                                                    .cornerRadius(10)
                                                }
                                            }
                                        }
                                        .padding(.horizontal, 16)
                                    }
                                    .transition(.opacity.combined(with: .move(edge: .top)))
                                }
                            }
                            .padding(.bottom, 8)
                        }
                    }
                    .background(Color(.systemGroupedBackground))

                    if viewModel.enrollments.isEmpty {
                        VStack(spacing: 24) {
                            Image(systemName: "person.3").font(.system(size: 50, weight: .light)).foregroundColor(.systemAccent)
                            Text("No Enrollments").font(.system(size: 22, weight: .bold)).foregroundColor(.systemTextDark)
                            Text("There are no approved onsite enrollments for this course.").font(.system(size: 15)).foregroundColor(.secondary).multilineTextAlignment(.center).padding(.horizontal, 40)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else if filteredEnrollments.isEmpty {
                        VStack(spacing: 24) {
                            Image(systemName: "magnifyingglass").font(.system(size: 50, weight: .light)).foregroundColor(.systemAccent)
                            Text("No Results").font(.system(size: 22, weight: .bold)).foregroundColor(.systemTextDark)
                            Text("Try adjusting search or organization filter.").font(.system(size: 15)).foregroundColor(.secondary).multilineTextAlignment(.center).padding(.horizontal, 40)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 12) {
                                ForEach(filteredEnrollments) { e in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(e.studentName).font(.system(size: 16, weight: .semibold)).foregroundColor(.primary)
                                            if let o = e.organizationName, !o.isEmpty {
                                                Text(o).font(.system(size: 13)).foregroundColor(.secondary)
                                            }
                                            VStack(alignment: .leading, spacing: 4) {
                                                if let t = e.checkInTime {
                                                    Text("Check In:").font(.system(size: 11, weight: .medium)).foregroundColor(.secondary)
                                                    Text(formatTime(t)).font(.system(size: 12)).foregroundColor(.green)
                                                }
                                                if let t = e.checkOutTime {
                                                    Text("Check Out:").font(.system(size: 11, weight: .medium)).foregroundColor(.secondary)
                                                    Text(formatTime(t)).font(.system(size: 12)).foregroundColor(.orange)
                                                }
                                            }
                                        }
                                        Spacer()
                                        if e.checkOutTime != nil {
                                            Text("Completed").font(.system(size: 12, weight: .semibold)).foregroundColor(.secondary)
                                        } else if viewModel.performingEnrollmentId == e.id {
                                            ProgressView().scaleEffect(0.9)
                                        } else if e.isCheckedIn {
                                            Button(action: {
                                                pendingManualEnrollment = e
                                                pendingManualIsCheckIn = false
                                                showManualCheckInOutConfirmation = true
                                            }) {
                                                Text("Check Out").font(.system(size: 13, weight: .semibold)).foregroundColor(.white)
                                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                                    .background(Color.orange).cornerRadius(10)
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                        } else {
                                            Button(action: {
                                                pendingManualEnrollment = e
                                                pendingManualIsCheckIn = true
                                                showManualCheckInOutConfirmation = true
                                            }) {
                                                Text("Check In").font(.system(size: 13, weight: .semibold)).foregroundColor(.white)
                                                    .padding(.horizontal, 12).padding(.vertical, 8)
                                                    .background(Color.green).cornerRadius(10)
                                            }
                                            .buttonStyle(PlainButtonStyle())
                                        }
                                    }
                                    .padding(14)
                                    .background(Color(.systemBackground))
                                    .cornerRadius(12)
                                }
                            }
                            .padding(16)
                            .padding(.bottom, 100)
                        }
                    }
                }
                .overlay(
                    VStack { Spacer()
                        HStack { Spacer()
                            Button(action: { showScanOptions = true }) {
                                Image(systemName: "qrcode.viewfinder")
                                    .font(.system(size: 24, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(width: 64, height: 64)
                                    .background(LinearGradient(gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]), startPoint: .topLeading, endPoint: .bottomTrailing))
                                    .clipShape(Circle())
                                    .shadow(color: Color.systemAccent.opacity(0.4), radius: 12, x: 0, y: 6)
                                    .overlay(Circle().stroke(Color.white, lineWidth: 3))
                            }
                            .padding(.trailing, 20).padding(.bottom, 20)
                        }
                    },
                    alignment: .bottomTrailing
                )
            }
        }
        .navigationTitle(course.courseTitleAr ?? course.courseTitle)
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(isPresented: $showScanOptions) {
            ScanOptionsView(
                onCheckIn: {
                    scanMode = .checkIn
                    showScanOptions = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { isScanningEnabled = true; showQRScanner = true }
                },
                onCheckOut: {
                    scanMode = .checkOut
                    showScanOptions = false
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { isScanningEnabled = true; showQRScanner = true }
                },
                onDismiss: { showScanOptions = false }
            )
        }
        .fullScreenCover(isPresented: $showQRScanner) {
            QRScannerView(isScanningEnabled: $isScanningEnabled) { barcode in
                isScanningEnabled = false
                showQRScanner = false
                Task {
                    if scanMode == .checkIn {
                        await viewModel.performCheckIn(barcode: barcode)
                    } else {
                        await viewModel.performCheckOut(barcode: barcode)
                    }
                }
            }
        }
        .fullScreenCover(isPresented: $showQRScannerForSearch) {
            QRScannerView(isScanningEnabled: .constant(true)) { barcode in
                searchText = barcode
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { showQRScannerForSearch = false }
            }
        }
        .alert(viewModel.alertTitle, isPresented: $viewModel.showAlert) {
            Button("OK", role: .cancel) { }
        } message: { Text(viewModel.alertMessage) }
        .alert(pendingManualIsCheckIn ? "Check In" : "Check Out", isPresented: $showManualCheckInOutConfirmation) {
            Button("Cancel", role: .cancel) {
                pendingManualEnrollment = nil
            }
            Button(pendingManualIsCheckIn ? "Check In" : "Check Out") {
                guard let en = pendingManualEnrollment else { return }
                let id = en.id
                let isCheckIn = pendingManualIsCheckIn
                pendingManualEnrollment = nil
                if isCheckIn {
                    Task { await viewModel.performManualCheckIn(enrollmentId: id) }
                } else {
                    Task { await viewModel.performManualCheckOut(enrollmentId: id) }
                }
            }
        } message: {
            if let en = pendingManualEnrollment {
                Text(pendingManualIsCheckIn ? "Check in \(en.studentName)?" : "Check out \(en.studentName)?")
            }
        }
        .task { await viewModel.loadEnrollments(courseId: course.id) }
    }

    private func formatTime(_ s: String) -> String {
        // .NET often sends DateTime with no timezone (server/local). Treat no-TZ as local to avoid +3hr when we wrongly assumed UTC.
        let normalized = normalizeIso8601Fraction(s)
        var d: Date?
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        iso.timeZone = TimeZone.current
        d = iso.date(from: normalized)
        if d == nil {
            iso.formatOptions = [.withInternetDateTime]
            d = iso.date(from: normalized)
        }
        if d == nil {
            let fallback = DateFormatter()
            fallback.locale = Locale(identifier: "en_US_POSIX")
            fallback.timeZone = TimeZone.current
            for fmt in ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS", "yyyy-MM-dd'T'HH:mm:ss.SSS", "yyyy-MM-dd'T'HH:mm:ssZ", "yyyy-MM-dd'T'HH:mm:ss"] {
                fallback.dateFormat = fmt
                if let parsed = fallback.date(from: normalized) { d = parsed; break }
            }
        }
        guard let d = d else { return s }
        let out = DateFormatter()
        out.dateFormat = "MMM d, yyyy, hh:mm a"
        out.locale = Locale(identifier: "en_US_POSIX")
        out.timeZone = TimeZone.current
        return out.string(from: d)
    }

    /// Trims fractional seconds to 3 digits so ISO8601DateFormatter can parse .NET’s 6–7 digit fractions.
    private func normalizeIso8601Fraction(_ s: String) -> String {
        guard let dot = s.firstIndex(of: ".") else { return s }
        let after = s.index(after: dot)
        guard after < s.endIndex, s[after].isNumber else { return s }
        var end = after
        while end < s.endIndex && s[end].isNumber { end = s.index(after: end) }
        let digits = s[after..<end]
        if digits.count <= 3 { return s }
        let keep = String(digits.prefix(3))
        return String(s[..<after]) + keep + (end < s.endIndex ? String(s[end...]) : "")
    }
}

// MARK: - ViewModel
class CourseAttendanceViewModel: ObservableObject {
    @Published var enrollments: [CourseEnrollmentForAttendance] = []
    @Published var isLoading = false
    @Published var performingEnrollmentId: Int? = nil
    @Published var showAlert = false
    @Published var alertTitle = ""
    @Published var alertMessage = ""
    private var currentCourseId: Int = 0

    func loadEnrollments(courseId: Int, silent: Bool = false) async {
        currentCourseId = courseId
        if !silent { await MainActor.run { isLoading = true } }
        do {
            let list = try await APIService.shared.getCourseEnrollmentsForAttendance(courseId: courseId)
            await MainActor.run { enrollments = list; isLoading = false }
        } catch {
            await MainActor.run {
                isLoading = false
                if !silent {
                    alertTitle = "Error"
                    alertMessage = (error as? APIError)?.errorDescription ?? error.localizedDescription
                    showAlert = true
                }
            }
        }
    }

    func performCheckIn(barcode: String) async {
        do {
            try await APIService.shared.courseCheckIn(barcode: barcode)
            await MainActor.run { alertTitle = "Check-In"; alertMessage = "Check-in successful."; showAlert = true }
            if currentCourseId > 0 { Task { await loadEnrollments(courseId: currentCourseId, silent: true) } }
        } catch {
            await MainActor.run { alertTitle = "Check-In Error"; alertMessage = (error as? APIError)?.errorDescription ?? "Check-in failed."; showAlert = true }
        }
    }

    func performCheckOut(barcode: String) async {
        do {
            try await APIService.shared.courseCheckOut(barcode: barcode)
            await MainActor.run { alertTitle = "Check-Out"; alertMessage = "Check-out successful."; showAlert = true }
            if currentCourseId > 0 { Task { await loadEnrollments(courseId: currentCourseId, silent: true) } }
        } catch {
            await MainActor.run { alertTitle = "Check-Out Error"; alertMessage = (error as? APIError)?.errorDescription ?? "Check-out failed."; showAlert = true }
        }
    }

    func performManualCheckIn(enrollmentId: Int) async {
        await MainActor.run { performingEnrollmentId = enrollmentId }
        do {
            try await APIService.shared.courseManualCheckIn(enrollmentId: enrollmentId)
            await MainActor.run { performingEnrollmentId = nil; alertTitle = "Check-In"; alertMessage = "Check-in successful."; showAlert = true }
            if currentCourseId > 0 { Task { await loadEnrollments(courseId: currentCourseId, silent: true) } }
        } catch {
            await MainActor.run {
                performingEnrollmentId = nil
                alertTitle = "Check-In Error"
                alertMessage = (error as? APIError)?.errorDescription ?? "Check-in failed."
                showAlert = true
            }
        }
    }

    func performManualCheckOut(enrollmentId: Int) async {
        await MainActor.run { performingEnrollmentId = enrollmentId }
        do {
            try await APIService.shared.courseManualCheckOut(enrollmentId: enrollmentId)
            await MainActor.run { performingEnrollmentId = nil; alertTitle = "Check-Out"; alertMessage = "Check-out successful."; showAlert = true }
            if currentCourseId > 0 { Task { await loadEnrollments(courseId: currentCourseId, silent: true) } }
        } catch {
            await MainActor.run {
                performingEnrollmentId = nil
                alertTitle = "Check-Out Error"
                alertMessage = (error as? APIError)?.errorDescription ?? "Check-out failed."
                showAlert = true
            }
        }
    }
}
