// DIALOGS AND ALERTS TO ADD
// Add these to EventRegistrationsView after the existing alerts (around line 600)

// ===== SEAT NUMBER DIALOG =====
// Add this .sheet modifier
.sheet(isPresented: $showSeatNumberDialog) {
    SeatNumberDialogView(
        registration: selectedRegistrationForSeat,
        seatNumberInput: $seatNumberInput,
        onSave: {
            if let reg = selectedRegistrationForSeat, let id = reg.id {
                Task {
                    await viewModel.updateSeatNumber(id: id, seatNumber: seatNumberInput.isEmpty ? nil : seatNumberInput)
                }
            }
            showSeatNumberDialog = false
        },
        onCancel: {
            showSeatNumberDialog = false
        }
    )
    .onAppear {
        seatNumberInput = selectedRegistrationForSeat?.seatNumber ?? ""
    }
}

// ===== APPROVE CONFIRMATION ALERT =====
.alert("Approve Registration", isPresented: $showApproveConfirmation) {
    Button("Cancel", role: .cancel) { }
    Button("Approve") {
        if let reg = selectedRegistrationForAction, let id = reg.id {
            Task {
                await viewModel.approveRegistration(id: id)
            }
        }
    }
} message: {
    if let reg = selectedRegistrationForAction {
        Text("Are you sure you want to approve the registration for \(reg.name)? A confirmation email with badge will be sent.")
    }
}

// ===== REJECT CONFIRMATION ALERT =====
.alert("Reject Registration", isPresented: $showRejectConfirmation) {
    Button("Cancel", role: .cancel) { }
    Button("Reject", role: .destructive) {
        if let reg = selectedRegistrationForAction, let id = reg.id {
            Task {
                await viewModel.rejectRegistration(id: id)
            }
        }
    }
} message: {
    if let reg = selectedRegistrationForAction {
        Text("Are you sure you want to reject the registration for \(reg.name)?")
    }
}

// ===== FINAL APPROVAL CONFIRMATION ALERT =====
.alert("Send Final Approval", isPresented: $showFinalApprovalConfirmation) {
    Button("Cancel", role: .cancel) { }
    Button("Send") {
        if let reg = selectedRegistrationForAction, let id = reg.id {
            Task {
                await viewModel.sendFinalApprovalEmail(id: id)
            }
        }
    }
} message: {
    if let reg = selectedRegistrationForAction {
        Text("Send final approval email to \(reg.name) with badge and event agenda?")
    }
}


// ===== SEAT NUMBER DIALOG VIEW =====
// Add this struct before the ViewModel (around line 1100)

struct SeatNumberDialogView: View {
    let registration: EventRegistration?
    @Binding var seatNumberInput: String
    let onSave: () -> Void
    let onCancel: () -> Void
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                Spacer()
                
                // Icon
                ZStack {
                    Circle()
                        .fill(
                            LinearGradient(
                                gradient: Gradient(colors: [Color.systemAccent.opacity(0.2), Color.systemAccent.opacity(0.05)]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 80, height: 80)
                    
                    Image(systemName: "chair.fill")
                        .font(.system(size: 36))
                        .foregroundColor(.systemAccent)
                }
                
                // Title
                VStack(spacing: 8) {
                    Text("Assign Seat Number")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(.systemTextDark)
                    
                    if let reg = registration {
                        Text(reg.name)
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                }
                
                // Input Field
                VStack(alignment: .leading, spacing: 8) {
                    Text("Seat Number")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.systemTextDark)
                    
                    TextField("Enter seat number (e.g., A12)", text: $seatNumberInput)
                        .textFieldStyle(PlainTextFieldStyle())
                        .font(.system(size: 16))
                        .padding()
                        .background(Color(.systemGray6))
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(seatNumberInput.isEmpty ? Color.clear : Color.systemAccent.opacity(0.3), lineWidth: 2)
                        )
                }
                
                Spacer()
                
                // Action Buttons
                HStack(spacing: 12) {
                    Button(action: onCancel) {
                        Text("Cancel")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color(.systemGray5))
                            .cornerRadius(12)
                    }
                    
                    Button(action: onSave) {
                        Text("Save")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                    }
                }
            }
            .padding(24)
            .navigationBarHidden(true)
        }
    }
}
