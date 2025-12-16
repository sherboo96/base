import SwiftUI

struct EventRegistrationsView: View {
    let event: Event
    @StateObject private var viewModel = EventRegistrationsViewModel()
    @State private var showQRScanner = false
    @State private var showScanOptions = false
    @State private var showTimeRestrictionAlert = false
    @State private var scanMode: ScanMode = .checkIn
    @State private var isScanningEnabled = false
    @Environment(\.dismiss) private var dismiss
    
    enum ScanMode {
        case checkIn
        case checkOut
    }
    
    // Check if scanning is allowed (2 hours before event)
    var isScanningAllowed: Bool {
        guard let eventDateString = event.date else {
            return false
        }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        guard let eventDate = formatter.date(from: eventDateString) else {
            // Try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            guard let eventDate = formatter.date(from: eventDateString) else {
                return false
            }
            return isWithinScanWindow(eventDate: eventDate)
        }
        
        return isWithinScanWindow(eventDate: eventDate)
    }
    
    private func isWithinScanWindow(eventDate: Date) -> Bool {
        let now = Date()
        let twoHoursBefore = eventDate.addingTimeInterval(-2 * 60 * 60) // 2 hours before
        
        // Allow scanning from 2 hours before the event until after the event ends
        return now >= twoHoursBefore
    }
    
    private func getTimeRestrictionMessage() -> String {
        guard let eventDateString = event.date else {
            return "Event date is not available."
        }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        var eventDate: Date?
        if let date = formatter.date(from: eventDateString) {
            eventDate = date
        } else {
            formatter.formatOptions = [.withInternetDateTime]
            eventDate = formatter.date(from: eventDateString)
        }
        
        guard let eventDate = eventDate else {
            return "Event date is not available."
        }
        
        let twoHoursBefore = eventDate.addingTimeInterval(-2 * 60 * 60)
        let now = Date()
        
        if now < twoHoursBefore {
            let timeUntilAllowed = twoHoursBefore.timeIntervalSince(now)
            let hours = Int(timeUntilAllowed / 3600)
            let minutes = Int((timeUntilAllowed.truncatingRemainder(dividingBy: 3600)) / 60)
            
            if hours > 0 {
                return "Scanning will be available \(hours) hour\(hours == 1 ? "" : "s") and \(minutes) minute\(minutes == 1 ? "" : "s") before the event."
            } else {
                return "Scanning will be available in \(minutes) minute\(minutes == 1 ? "" : "s")."
            }
        }
        
        return "Scanning is now available."
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()
                
                if viewModel.isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Loading registrations...")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                } else {
                    ZStack {
                        // Registrations List
                        if viewModel.registrations.isEmpty {
                            VStack(spacing: 16) {
                                Image(systemName: "person.3")
                                    .font(.system(size: 50))
                                    .foregroundColor(.gray.opacity(0.5))
                                
                                Text("No Approved Registrations")
                                    .font(.system(size: 18, weight: .semibold))
                                    .foregroundColor(.primary)
                                
                                Text("There are no approved registrations for this event")
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 40)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else {
                            ScrollView {
                                LazyVStack(spacing: 12) {
                                    ForEach(viewModel.registrations) { registration in
                                        RegistrationRowView(registration: registration)
                                    }
                                }
                                .padding(.horizontal, 16)
                                .padding(.top, 16)
                                .padding(.bottom, 100) // Extra padding for floating button
                            }
                        }
                        
                        // Floating QR Scanner Button (Bottom Right)
                        VStack {
                            Spacer()
                            HStack {
                                Spacer()
                                Button(action: {
                                    if isScanningAllowed {
                                        showScanOptions = true
                                    } else {
                                        showTimeRestrictionAlert = true
                                    }
                                }) {
                                    Image(systemName: isScanningAllowed ? "qrcode.viewfinder" : "clock.fill")
                                        .font(.system(size: 24, weight: .semibold))
                                        .foregroundColor(.white)
                                        .frame(width: 64, height: 64)
                                        .background(
                                            LinearGradient(
                                                gradient: Gradient(colors: isScanningAllowed ?
                                                    [Color.blue, Color.blue.opacity(0.8)] :
                                                    [Color.gray, Color.gray.opacity(0.8)]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .clipShape(Circle())
                                        .shadow(color: isScanningAllowed ? Color.blue.opacity(0.4) : Color.gray.opacity(0.4), radius: 12, x: 0, y: 6)
                                        .overlay(
                                            Circle()
                                                .stroke(Color.white, lineWidth: 3)
                                        )
                                        .opacity(isScanningAllowed ? 1.0 : 0.6)
                                }
                                .padding(.trailing, 20)
                                .padding(.bottom, 20)
                            }
                        }
                    }
                }
            }
            .navigationTitle(event.name)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        dismiss()
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "chevron.left")
                            Text("Back")
                        }
                        .foregroundColor(.blue)
                    }
                }
            }
            .fullScreenCover(isPresented: $showScanOptions) {
                ScanOptionsView(
                    onCheckIn: {
                        scanMode = .checkIn
                        showScanOptions = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            isScanningEnabled = true
                            showQRScanner = true
                        }
                    },
                    onCheckOut: {
                        scanMode = .checkOut
                        showScanOptions = false
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            isScanningEnabled = true
                            showQRScanner = true
                        }
                    },
                    onDismiss: {
                        showScanOptions = false
                    }
                )
            }
            .fullScreenCover(isPresented: $showQRScanner) {
                QRScannerView(isScanningEnabled: $isScanningEnabled) { barcode in
                    Task {
                        if scanMode == .checkIn {
                            await viewModel.performCheckIn(barcode: barcode)
                        } else {
                            await viewModel.performCheckOut(barcode: barcode)
                        }
                        // Close scanner after scan attempt
                        await MainActor.run {
                            isScanningEnabled = false
                            showQRScanner = false
                        }
                    }
                }
            }
            .alert(viewModel.alertTitle, isPresented: $viewModel.showAlert) {
                if viewModel.showCheckInOutOptions {
                    if viewModel.alertTitle.contains("Check Out") {
                        // Show only Check-Out button
                        Button("Check-Out") {
                            Task {
                                await viewModel.performCheckOut(barcode: viewModel.scannedBarcode ?? "")
                            }
                        }
                    } else {
                        // Show only Check-In button
                        Button("Check-In") {
                            Task {
                                await viewModel.performCheckIn(barcode: viewModel.scannedBarcode ?? "")
                            }
                        }
                    }
                    Button("Cancel", role: .cancel) { }
                } else {
                    Button("OK", role: .cancel) { }
                }
            } message: {
                Text(viewModel.alertMessage)
            }
            .alert("Scanning Not Available", isPresented: $showTimeRestrictionAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(getTimeRestrictionMessage())
            }
            .task {
                await viewModel.loadRegistrations(eventId: event.id ?? 0)
            }
        }
    }
}

struct RegistrationRowView: View {
    let registration: EventRegistration
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with Name and Status
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(registration.name)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.primary)
                    
                    if let nameAr = registration.nameAr, !nameAr.isEmpty {
                        Text(nameAr)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Check-in/Check-out Status Badge
                if registration.isCheckedIn {
                    VStack(alignment: .trailing, spacing: 4) {
                        if registration.isCheckedOut {
                            HStack(spacing: 6) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.orange)
                                    .font(.system(size: 14))
                                Text("Checked Out")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.orange)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.orange.opacity(0.1))
                            .cornerRadius(8)
                        } else {
                            HStack(spacing: 6) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                    .font(.system(size: 14))
                                Text("Checked In")
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundColor(.green)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color.green.opacity(0.1))
                            .cornerRadius(8)
                        }
                        
                        // Show check-in time if available
                        if let checkIn = registration.latestCheckIn,
                           let checkInTime = checkIn.checkInDateTime {
                            Text(formatDateTime(checkInTime))
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                        }
                    }
                } else {
                    HStack(spacing: 6) {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.gray)
                            .font(.system(size: 14))
                        Text("Not Checked In")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.gray)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                }
            }
            
            Divider()
                .padding(.vertical, 4)
            
            // Details Section
            VStack(spacing: 10) {
                HStack(spacing: 12) {
                    Image(systemName: "envelope.fill")
                        .foregroundColor(.blue)
                        .frame(width: 20)
                    
                    Text(registration.email)
                        .font(.system(size: 14))
                        .foregroundColor(.primary)
                    
                    Spacer()
                }
                
                if let barcode = registration.barcode {
                    HStack(spacing: 12) {
                        Image(systemName: "barcode")
                            .foregroundColor(.green)
                            .frame(width: 20)
                        
                        Text(barcode)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.secondary)
                        
                        Spacer()
                    }
                }
                
                if let organization = registration.eventOrganization?.name {
                    HStack(spacing: 12) {
                        Image(systemName: "building.2.fill")
                            .foregroundColor(.orange)
                            .frame(width: 20)
                        
                        Text(organization)
                            .font(.system(size: 14))
                            .foregroundColor(.primary)
                        
                        Spacer()
                    }
                }
            }
            
            // Check-in and Check-out Section at the end
            Divider()
                .padding(.vertical, 8)
            
            VStack(spacing: 8) {
                // Check-In
                if let checkIn = registration.latestCheckIn,
                   let checkInTime = checkIn.checkInDateTime {
                    HStack(spacing: 12) {
                        Image(systemName: "arrow.right.circle.fill")
                            .foregroundColor(.green)
                            .frame(width: 20)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Check-In")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.secondary)
                            
                            Text(formatDateTime(checkInTime))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.green)
                        }
                        
                        Spacer()
                    }
                } else {
                    HStack(spacing: 12) {
                        Image(systemName: "arrow.right.circle")
                            .foregroundColor(.gray)
                            .frame(width: 20)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Check-In")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.secondary)
                            
                            Text("Not Checked In")
                                .font(.system(size: 14))
                                .foregroundColor(.gray)
                        }
                        
                        Spacer()
                    }
                }
                
                // Check-Out
                if let checkIn = registration.latestCheckIn,
                   let checkOutTime = checkIn.checkOutDateTime {
                    HStack(spacing: 12) {
                        Image(systemName: "arrow.left.circle.fill")
                            .foregroundColor(.orange)
                            .frame(width: 20)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Check-Out")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.secondary)
                            
                            Text(formatDateTime(checkOutTime))
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.orange)
                        }
                        
                        Spacer()
                    }
                } else if registration.isCheckedIn {
                    HStack(spacing: 12) {
                        Image(systemName: "arrow.left.circle")
                            .foregroundColor(.gray)
                            .frame(width: 20)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Check-Out")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.secondary)
                            
                            Text("Not Checked Out")
                                .font(.system(size: 14))
                                .foregroundColor(.gray)
                        }
                        
                        Spacer()
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(registration.isCheckedIn ? (registration.isCheckedOut ? Color.orange.opacity(0.3) : Color.green.opacity(0.3)) : Color.clear, lineWidth: 2)
        )
    }
    
    private func formatDateTime(_ dateString: String?) -> String {
        guard let dateString = dateString else {
            return "-"
        }
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        var date: Date?
        if let parsedDate = formatter.date(from: dateString) {
            date = parsedDate
        } else {
            // Fallback: try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: dateString)
        }
        
        guard let date = date else {
            return dateString
        }
        
        // Format: DD/MM/YYYY HH:MM AM/PM (e.g., 13/12/2025 11:19 AM)
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "dd/MM/yyyy hh:mm a"
        
        return displayFormatter.string(from: date)
    }
}

// Custom view for scan options
struct ScanOptionsView: View {
    let onCheckIn: () -> Void
    let onCheckOut: () -> Void
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            // Semi-transparent background overlay
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }
            
            // Content Card
            VStack(spacing: 0) {
                // Header
                HStack {
                    Text("Select Action")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    Button(action: {
                        onDismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundColor(.gray)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 20)
                
                // Action Buttons
                HStack(spacing: 20) {
                    // Check-In Button
                    Button(action: {
                        onCheckIn()
                    }) {
                        VStack(spacing: 16) {
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.white)
                            
                            Text("Check-In")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.green, Color.green.opacity(0.8)]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .cornerRadius(20)
                        .shadow(color: Color.green.opacity(0.4), radius: 12, x: 0, y: 6)
                    }
                    
                    // Check-Out Button
                    Button(action: {
                        onCheckOut()
                    }) {
                        VStack(spacing: 16) {
                            Image(systemName: "arrow.left.circle.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.white)
                            
                            Text("Check-Out")
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(.white)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                        .background(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.orange, Color.orange.opacity(0.8)]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .cornerRadius(20)
                        .shadow(color: Color.orange.opacity(0.4), radius: 12, x: 0, y: 6)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 32)
            }
            .background(Color(.systemBackground))
            .cornerRadius(24)
            .shadow(color: Color.black.opacity(0.2), radius: 20, x: 0, y: 10)
            .padding(.horizontal, 32)
        }
    }
}

class EventRegistrationsViewModel: ObservableObject {
    @Published var registrations: [EventRegistration] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showAlert = false
    @Published var alertTitle = "Check-in"
    @Published var alertMessage = ""
    @Published var showCheckInOutOptions = false
    @Published var scannedBarcode: String?
    private var currentEventId: Int = 0
    
    func loadRegistrations(eventId: Int) async {
        currentEventId = eventId
        await MainActor.run {
            isLoading = true
        }
        
        do {
            let loadedRegistrations = try await APIService.shared.getEventRegistrations(eventId: eventId)
            await MainActor.run {
                registrations = loadedRegistrations
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
    
    func handleScan(barcode: String) async {
        await MainActor.run {
            scannedBarcode = barcode
        }
        
        // Find registration in local list
        if let registration = registrations.first(where: { $0.barcode == barcode }) {
            await MainActor.run {
                if registration.isCheckedIn && !registration.isCheckedOut {
                    // Already checked in, show check-out option
                    alertTitle = "Scan Result - Check Out"
                    alertMessage = "\(registration.name) is already checked in.\n\nWould you like to check out?"
                    showCheckInOutOptions = true
                    showAlert = true
                } else if registration.isCheckedOut {
                    // Already checked out
                    alertTitle = "Scan Result"
                    alertMessage = "\(registration.name) is already checked out."
                    showCheckInOutOptions = false
                    showAlert = true
                } else {
                    // Not checked in, show check-in option
                    alertTitle = "Scan Result - Check In"
                    alertMessage = "\(registration.name) is not checked in.\n\nWould you like to check in?"
                    showCheckInOutOptions = true
                    showAlert = true
                }
            }
        } else {
            // Registration not found in list, try to check in anyway
            await MainActor.run {
                alertTitle = "Scan Result - Check In"
                alertMessage = "Registration not found in current list.\n\nWould you like to check in?"
                showCheckInOutOptions = true
                showAlert = true
            }
        }
    }
    
    func performCheckIn(barcode: String) async {
        do {
            _ = try await APIService.shared.checkIn(barcode: barcode)
            await MainActor.run {
                alertTitle = "Check-In"
                alertMessage = "Check-in successful!"
                showCheckInOutOptions = false
                showAlert = true
            }
            // Reload registrations to update check-in status
            if currentEventId > 0 {
                await loadRegistrations(eventId: currentEventId)
            }
        } catch {
            await MainActor.run {
                alertTitle = "Check-In Error"
                if let apiError = error as? APIError {
                    alertMessage = apiError.errorDescription ?? "Check-in failed"
                } else {
                    alertMessage = error.localizedDescription
                }
                showCheckInOutOptions = false
                showAlert = true
            }
        }
    }
    
    func performCheckOut(barcode: String) async {
        do {
            _ = try await APIService.shared.checkOut(barcode: barcode)
            await MainActor.run {
                alertTitle = "Check-Out"
                alertMessage = "Check-out successful!"
                showCheckInOutOptions = false
                showAlert = true
            }
            // Reload registrations to update check-out status
            if currentEventId > 0 {
                await loadRegistrations(eventId: currentEventId)
            }
        } catch {
            await MainActor.run {
                alertTitle = "Check-Out Error"
                if let apiError = error as? APIError {
                    alertMessage = apiError.errorDescription ?? "Check-out failed"
                } else {
                    alertMessage = error.localizedDescription
                }
                showCheckInOutOptions = false
                showAlert = true
            }
        }
    }
}

