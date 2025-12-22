// ENHANCED REGISTRATION ROW VIEW WITH 3-DOT MENU
// This replaces the existing RegistrationRowView struct (lines 754-1011)
// Copy this entire struct to replace the old one

struct RegistrationRowView: View {
    let registration: EventRegistration
    @Binding var selectedRegistrationForSeat: EventRegistration?
    @Binding var showSeatNumberDialog: Bool
    @Binding var selectedRegistrationForAction: EventRegistration?
    @Binding var showApproveConfirmation: Bool
    @Binding var showRejectConfirmation: Bool
    @Binding var showFinalApprovalConfirmation: Bool
    @State private var showMenu = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // HEADER: Name + Status Badge + Menu
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(registration.name)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.systemTextDark)
                    
                    if let nameAr = registration.nameAr, !nameAr.isEmpty {
                        Text(nameAr)
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                // Status Badge
                statusBadge
                
                // 3-Dot Menu Button
                Menu {
                    menuContent
                } label: {
                    Image(systemName: "ellipsis.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.systemAccent)
                }
            }
            
            Divider()
                .padding(.vertical, 4)
            
            // DETAILS SECTION
            VStack(spacing: 10) {
                // Email
                HStack(spacing: 12) {
                    Image(systemName: "envelope.fill")
                        .foregroundColor(.systemAccent)
                        .frame(width: 20)
                    
                    Text(registration.email)
                        .font(.system(size: 14))
                        .foregroundColor(.primary)
                    
                    Spacer()
                }
                
                // Barcode
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
                
                // Seat Number
                HStack(spacing: 12) {
                    Image(systemName: "chair.fill")
                        .foregroundColor(.purple)
                        .frame(width: 20)
                    
                    if let seatNumber = registration.seatNumber, !seatNumber.isEmpty {
                        Text("Seat: \(seatNumber)")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.primary)
                    } else {
                        Text("No Seat Assigned")
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                }
                
                // Organization
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
            
            // EMAIL STATUS SECTION
            Divider()
                .padding(.vertical, 4)
            
            VStack(alignment: .leading, spacing: 8) {
                Text("Email Status")
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.systemTextDark)
                
                emailStatusRow(
                    icon: "envelope.badge.fill",
                    title: "Registration Email",
                    sent: registration.registrationSuccessfulEmailSent ?? false,
                    sentAt: registration.registrationSuccessfulEmailSentAt
                )
                
                emailStatusRow(
                    icon: "checkmark.seal.fill",
                    title: "Confirmation Email",
                    sent: registration.confirmationEmailSent ?? false,
                    sentAt: registration.confirmationEmailSentAt
                )
                
                emailStatusRow(
                    icon: "star.fill",
                    title: "Final Approval Email",
                    sent: registration.finalApprovalEmailSent ?? false,
                    sentAt: registration.finalApprovalEmailSentAt
                )
            }
            
            // UPDATED BY SECTION
            if let updatedBy = registration.updatedBy, let updatedAt = registration.updatedAt {
                Divider()
                    .padding(.vertical, 4)
                
                HStack(spacing: 8) {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    
                    Text("Updated by \(updatedBy)")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    
                    Text("•")
                        .foregroundColor(.secondary)
                    
                    Text(formatDateTime(updatedAt))
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: 3)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(statusBorderColor, lineWidth: 2)
        )
    }
    
    // 3-Dot Menu Content
    @ViewBuilder
    private var menuContent: some View {
        // DRAFT STATUS - Show Approve and Reject
        if registration.status == .draft {
            Button(action: {
                selectedRegistrationForAction = registration
                showApproveConfirmation = true
            }) {
                Label("Approve Registration", systemImage: "checkmark.circle.fill")
            }
            
            Button(role: .destructive, action: {
                selectedRegistrationForAction = registration
                showRejectConfirmation = true
            }) {
                Label("Reject Registration", systemImage: "xmark.circle.fill")
            }
        }
        
        // APPROVED STATUS - Show Set Seat and/or Send Final Approval
        if registration.status == .approved {
            // Always show Set Seat option for approved registrations
            Button(action: {
                selectedRegistrationForSeat = registration
                showSeatNumberDialog = true
            }) {
                if let seatNumber = registration.seatNumber, !seatNumber.isEmpty {
                    Label("Edit Seat Number (\(seatNumber))", systemImage: "pencil.circle.fill")
                } else {
                    Label("Set Seat Number", systemImage: "chair.fill")
                }
            }
            
            // Show Send Final Approval if seat is assigned and email not sent
            if let seatNumber = registration.seatNumber,
               !seatNumber.isEmpty,
               !(registration.finalApprovalEmailSent ?? false) {
                Divider()
                
                Button(action: {
                    selectedRegistrationForAction = registration
                    showFinalApprovalConfirmation = true
                }) {
                    Label("Send Final Approval Email", systemImage: "paperplane.fill")
                }
            }
            
            // Show resend option if final approval was already sent
            if registration.finalApprovalEmailSent ?? false {
                Divider()
                
                Button(action: {
                    selectedRegistrationForAction = registration
                    showFinalApprovalConfirmation = true
                }) {
                    Label("Resend Final Approval Email", systemImage: "arrow.clockwise")
                }
            }
        }
        
        // REJECTED STATUS - Show info only
        if registration.status == .rejected {
            Text("No actions available")
                .foregroundColor(.secondary)
        }
    }
    
    // Status Badge View
    private var statusBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: statusIcon)
                .font(.system(size: 12, weight: .bold))
            Text(statusText)
                .font(.system(size: 13, weight: .bold))
        }
        .foregroundColor(.white)
        .padding(.horizontal: 12)
        .padding(.vertical, 6)
        .background(statusColor)
        .cornerRadius(10)
    }
    
    // Email Status Row
    private func emailStatusRow(icon: String, title: String, sent: Bool, sentAt: String?) -> some View {
        HStack(spacing: 10) {
            Image(systemName: sent ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 14))
                .foregroundColor(sent ? .green : .gray)
            
            Text(title)
                .font(.system(size: 13))
                .foregroundColor(.primary)
            
            Spacer()
            
            if sent, let sentAt = sentAt {
                Text(formatDateTime(sentAt))
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }
    
    // Status Properties
    private var statusColor: Color {
        switch registration.status {
        case .draft: return Color.orange
        case .approved: return Color.green
        case .rejected: return Color.red
        case .none: return Color.gray
        }
    }
    
    private var statusText: String {
        switch registration.status {
        case .draft: return "Draft"
        case .approved: return "Approved"
        case .rejected: return "Rejected"
        case .none: return "Unknown"
        }
    }
    
    private var statusIcon: String {
        switch registration.status {
        case .draft: return "doc.text.fill"
        case .approved: return "checkmark.seal.fill"
        case .rejected: return "xmark.seal.fill"
        case .none: return "questionmark.circle.fill"
        }
    }
    
    private var statusBorderColor: Color {
        switch registration.status {
        case .draft: return Color.orange.opacity(0.3)
        case .approved: return Color.green.opacity(0.3)
        case .rejected: return Color.red.opacity(0.3)
        case .none: return Color.clear
        }
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
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: dateString)
        }
        
        guard let date = date else {
            return dateString
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "dd/MM/yyyy hh:mm a"
        
        return displayFormatter.string(from: date)
    }
}
