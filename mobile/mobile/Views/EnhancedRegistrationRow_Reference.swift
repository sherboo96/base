// Enhanced Registration Row View with Management Features
// This file will be integrated into EventRegistrationsView.swift

struct EnhancedRegistrationRowView: View {
    let registration: EventRegistration
    @Binding var showSeatNumberDialog: Bool
    @Binding var selectedRegistration: EventRegistration?
    let onApprove: (Int) -> Void
    let onReject: (Int) -> Void
    let onSendFinalApproval: (Int) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // HEADER: Name + Status Badge
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
                
