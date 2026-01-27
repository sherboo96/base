import SwiftUI

struct EventRegistrationsView: View {
    let event: Event
    @StateObject private var viewModel = EventRegistrationsViewModel()
    @State private var showQRScanner = false
    @State private var showScanOptions = false
    @State private var scanMode: ScanMode = .checkIn
    @State private var isScanningEnabled = false
    @State private var searchText = ""
    @State private var selectedOrganizationId: Int? = nil
    @State private var expandedOrganizations: Set<Int?> = []
    @State private var showQRScannerForSearch = false
    @State private var animateGradient = false
    @State private var statusFilter: EventRegistrationStatus? = nil
    @State private var vipFilter: VipStatus? = nil // nil = all, .vip = VIP only, .vVip = VVIP only, .attendee = Attendee only
    @State private var isStatusFilterExpanded = false
    @State private var isVipFilterExpanded = false
    @State private var isOrganizationFilterExpanded = false
    @State private var showSeatNumberDialog = false
    @State private var selectedRegistrationForSeat: EventRegistration? = nil
    @State private var seatNumberInput = ""
    @State private var showApproveConfirmation = false
    @State private var showRejectConfirmation = false
    @State private var showFinalApprovalConfirmation = false
    @State private var selectedRegistrationForAction: EventRegistration? = nil
    @Environment(\.dismiss) private var dismiss
    
    enum ScanMode {
        case checkIn
        case checkOut
    }
    
    // Get unique organizations from registrations
    private var availableOrganizations: [EventOrganization] {
        let organizations = viewModel.registrations
            .compactMap { $0.eventOrganization }
            .reduce(into: [Int: EventOrganization]()) { dict, org in
                if let id = org.id {
                    dict[id] = org
                }
            }
        return Array(organizations.values).sorted { ($0.nameAr ?? $0.name) < ($1.nameAr ?? $1.name) }
    }
    
    // Filtered and grouped registrations
    private var groupedRegistrations: [(organization: EventOrganization?, organizationId: Int?, registrations: [EventRegistration])] {
        var filtered = viewModel.registrations
        
        // Apply search filter
        if !searchText.isEmpty {
            let searchLower = searchText.lowercased()
            filtered = filtered.filter { registration in
                registration.name.lowercased().contains(searchLower) ||
                (registration.nameAr?.lowercased().contains(searchLower) ?? false) ||
                registration.email.lowercased().contains(searchLower) ||
                (registration.jobTitle?.lowercased().contains(searchLower) ?? false) ||
                (registration.barcode?.lowercased().contains(searchLower) ?? false) ||
                (registration.eventOrganization?.name.lowercased().contains(searchLower) ?? false) ||
                (registration.eventOrganization?.nameAr?.lowercased().contains(searchLower) ?? false)
            }
        }
        
        // Apply organization filter
        if let selectedId = selectedOrganizationId {
            filtered = filtered.filter { $0.eventOrganizationId == selectedId }
        }
        
        // Apply status filter
        if let status = statusFilter {
            filtered = filtered.filter { $0.status == status }
        }
        // If no status filter is selected, show all registrations (including those with null status)
        
        // Apply VIP filter
        if let vipStatus = vipFilter {
            filtered = filtered.filter { 
                ($0.vipStatus ?? .attendee) == vipStatus
            }
        }
        
        // Group by organization
        let grouped = Dictionary(grouping: filtered) { registration in
            registration.eventOrganizationId
        }
        
        // Convert to array of tuples and sort
        let groups = grouped.map { (orgId, registrations) in
            let org = registrations.first?.eventOrganization
            return (organization: org, organizationId: orgId, registrations: registrations.sorted { $0.name < $1.name })
        }
        
        // Sort: organizations with names first (alphabetically), then "No Organization" groups last
        return groups.sorted { (group1, group2) in
            let org1 = group1.organization
            let org2 = group2.organization
            
            if org1 != nil && org2 == nil {
                return true
            }
            if org1 == nil && org2 != nil {
                return false
            }
            
            let name1 = org1?.nameAr ?? org1?.name ?? "No Organization"
            let name2 = org2?.nameAr ?? org2?.name ?? "No Organization"
            return name1 < name2
        }
    }
    
    var body: some View {
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
                    
                    Text("Loading registrations...")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundColor(.systemTextDark)
                }
            } else {
                    VStack(spacing: 0) {
                        // Search and Filter Section
                    VStack(spacing: 16) {
                            // Search Bar with Scan QR Button
                            HStack(spacing: 10) {
                                HStack(spacing: 10) {
                                    ZStack {
                                        Circle()
                                            .fill(Color.systemAccent.opacity(0.1))
                                            .frame(width: 30, height: 30)
                                        
                                    Image(systemName: "magnifyingglass")
                                            .foregroundColor(.systemAccent)
                                            .font(.system(size: 12, weight: .semibold))
                                    }
                                    
                                    TextField("Search by name, email, job title, or barcode...", text: $searchText)
                                        .textFieldStyle(PlainTextFieldStyle())
                                        .font(.system(size: 14, weight: .medium))
                                        .foregroundColor(.systemTextDark)
                                    
                                    if !searchText.isEmpty {
                                        Button(action: {
                                            searchText = ""
                                        }) {
                                            Image(systemName: "xmark.circle.fill")
                                                .foregroundColor(.systemAccent)
                                                .font(.system(size: 16))
                                        }
                                    }
                                }
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(Color(.systemBackground))
                                .cornerRadius(14)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14)
                                        .stroke(
                                            LinearGradient(
                                                gradient: Gradient(colors: searchText.isEmpty
                                                    ? [Color.gray.opacity(0.2), Color.gray.opacity(0.2)]
                                                    : [Color.systemAccent, Color.systemAccentLight]),
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            ),
                                            lineWidth: 2
                                        )
                                )
                                .shadow(color: searchText.isEmpty ? Color.clear : Color.systemAccent.opacity(0.1), radius: 8, x: 0, y: 4)
                                
                                // Scan QR Button
                                Button(action: {
                                    showQRScannerForSearch = true
                                }) {
                                    Image(systemName: "qrcode.viewfinder")
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(.white)
                                        .frame(width: 44, height: 44)
                                        .background(
                                            LinearGradient(
                                                gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .cornerRadius(12)
                                        .shadow(color: Color.systemAccent.opacity(0.4), radius: 6, x: 0, y: 3)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.top, 14)
                            
                            // Status Filter
                            VStack(alignment: .leading, spacing: 10) {
                                Button(action: {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        isStatusFilterExpanded.toggle()
                                    }
                                }) {
                                    HStack {
                                        Text("Filter by Status")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.systemTextDark)
                                        
                                        Spacer()
                                        
                                        Image(systemName: isStatusFilterExpanded ? "chevron.up" : "chevron.down")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.systemAccent)
                                    }
                                    .padding(.horizontal, 16)
                                }
                                
                                if isStatusFilterExpanded {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 10) {
                                        // "All" option
                                        Button(action: {
                                            statusFilter = nil
                                        }) {
                                            HStack(spacing: 6) {
                                                if statusFilter == nil {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                }
                                                Text("All")
                                                    .font(.system(size: 14, weight: .bold))
                                            }
                                            .foregroundColor(statusFilter == nil ? .white : .systemAccent)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(statusFilter == nil ? Color.systemAccent : Color.systemAccent.opacity(0.1))
                                            .cornerRadius(10)
                                        }
                                        
                                        // Draft
                                        Button(action: {
                                            statusFilter = .draft
                                        }) {
                                            HStack(spacing: 6) {
                                                if statusFilter == .draft {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                }
                                                Text("Draft")
                                                    .font(.system(size: 14, weight: .bold))
                                            }
                                            .foregroundColor(statusFilter == .draft ? .white : Color.orange)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(statusFilter == .draft ? Color.orange : Color.orange.opacity(0.1))
                                            .cornerRadius(10)
                                        }
                                        
                                        // Approved
                                        Button(action: {
                                            statusFilter = .approved
                                        }) {
                                            HStack(spacing: 6) {
                                                if statusFilter == .approved {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                }
                                                Text("Approved")
                                                    .font(.system(size: 14, weight: .bold))
                                            }
                                            .foregroundColor(statusFilter == .approved ? .white : Color.green)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(statusFilter == .approved ? Color.green : Color.green.opacity(0.1))
                                            .cornerRadius(10)
                                        }
                                        
                                        // Rejected
                                        Button(action: {
                                            statusFilter = .rejected
                                        }) {
                                            HStack(spacing: 6) {
                                                if statusFilter == .rejected {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                }
                                                Text("Rejected")
                                                    .font(.system(size: 14, weight: .bold))
                                            }
                                            .foregroundColor(statusFilter == .rejected ? .white : Color.red)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(statusFilter == .rejected ? Color.red : Color.red.opacity(0.1))
                                            .cornerRadius(10)
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                    }
                                    .transition(.opacity.combined(with: .move(edge: .top)))
                                }
                            }
                            
                            // VIP Filter
                            VStack(alignment: .leading, spacing: 10) {
                                Button(action: {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        isVipFilterExpanded.toggle()
                                    }
                                }) {
                                    HStack {
                                        Text("Filter by VIP Status")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundColor(.systemTextDark)
                                        
                                        Spacer()
                                        
                                        Image(systemName: isVipFilterExpanded ? "chevron.up" : "chevron.down")
                                            .font(.system(size: 12, weight: .semibold))
                                            .foregroundColor(.systemAccent)
                                    }
                                    .padding(.horizontal, 16)
                                }
                                
                                if isVipFilterExpanded {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 10) {
                                        // "All" option
                                        Button(action: {
                                            vipFilter = nil
                                        }) {
                                            HStack(spacing: 6) {
                                                if vipFilter == nil {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                }
                                                Text("All")
                                                    .font(.system(size: 14, weight: .bold))
                                            }
                                            .foregroundColor(vipFilter == nil ? .white : .systemAccent)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(vipFilter == nil ? Color.systemAccent : Color.systemAccent.opacity(0.1))
                                            .cornerRadius(10)
                                        }
                                        
                                        // Attendee Only
                                        Button(action: {
                                            vipFilter = .attendee
                                        }) {
                                            HStack(spacing: 6) {
                                                if vipFilter == .attendee {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                }
                                                Text("Attendee")
                                                    .font(.system(size: 14, weight: .bold))
                                            }
                                            .foregroundColor(vipFilter == .attendee ? .white : Color.gray)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(vipFilter == .attendee ? Color.gray : Color.gray.opacity(0.1))
                                            .cornerRadius(10)
                                        }
                                        
                                        // VIP Only
                                        Button(action: {
                                            vipFilter = .vip
                                        }) {
                                            HStack(spacing: 6) {
                                                if vipFilter == .vip {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                }
                                                Image(systemName: "star.fill")
                                                    .font(.system(size: 12, weight: .bold))
                                                Text("VIP")
                                                    .font(.system(size: 14, weight: .bold))
                                            }
                                            .foregroundColor(vipFilter == .vip ? .white : Color.purple)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(vipFilter == .vip ? Color.purple : Color.purple.opacity(0.1))
                                            .cornerRadius(10)
                                        }
                                        
                                        // V VIP Only
                                        Button(action: {
                                            vipFilter = .vVip
                                        }) {
                                            HStack(spacing: 6) {
                                                if vipFilter == .vVip {
                                                    Image(systemName: "checkmark")
                                                        .font(.system(size: 12, weight: .bold))
                                                }
                                                Image(systemName: "star.fill")
                                                    .font(.system(size: 12, weight: .bold))
                                                Text("V VIP")
                                                    .font(.system(size: 14, weight: .bold))
                                            }
                                            .foregroundColor(vipFilter == .vVip ? .white : Color.indigo)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(vipFilter == .vVip ? Color.indigo : Color.indigo.opacity(0.1))
                                            .cornerRadius(10)
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                    }
                                    .transition(.opacity.combined(with: .move(edge: .top)))
                                }
                            }
                            
                            // Organization Filter
                            if !availableOrganizations.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    Button(action: {
                                        withAnimation(.easeInOut(duration: 0.2)) {
                                            isOrganizationFilterExpanded.toggle()
                                        }
                                    }) {
                                        HStack {
                                    Text("Filter by Organization")
                                                .font(.system(size: 14, weight: .bold))
                                                .foregroundColor(.systemTextDark)
                                            
                                            Spacer()
                                            
                                            Image(systemName: isOrganizationFilterExpanded ? "chevron.up" : "chevron.down")
                                                .font(.system(size: 12, weight: .semibold))
                                                .foregroundColor(.systemAccent)
                                        }
                                        .padding(.horizontal, 16)
                                    }
                                    
                                    if isOrganizationFilterExpanded {
                                    ScrollView(.horizontal, showsIndicators: false) {
                                        HStack(spacing: 10) {
                                            // "All" option
                                            Button(action: {
                                                selectedOrganizationId = nil
                                            }) {
                                                HStack(spacing: 6) {
                                                    if selectedOrganizationId == nil {
                                                        Image(systemName: "checkmark")
                                                            .font(.system(size: 12, weight: .bold))
                                                    }
                                                    Text("All")
                                                        .font(.system(size: 14, weight: .semibold))
                                                }
                                                .foregroundColor(selectedOrganizationId == nil ? .white : .primary)
                                                .padding(.horizontal, 16)
                                                .padding(.vertical, 10)
                                                .background(
                                                    selectedOrganizationId == nil
                                                    ? LinearGradient(
                                                        gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                                        startPoint: .leading,
                                                        endPoint: .trailing
                                                    )
                                                    : LinearGradient(
                                                        gradient: Gradient(colors: [Color(.systemGray5), Color(.systemGray5)]),
                                                        startPoint: .leading,
                                                        endPoint: .trailing
                                                    )
                                                )
                                                .cornerRadius(20)
                                                .shadow(color: selectedOrganizationId == nil ? Color.systemAccent.opacity(0.3) : Color.clear, radius: 4, x: 0, y: 2)
                                            }
                                            
                                            ForEach(availableOrganizations, id: \.id) { org in
                                                Button(action: {
                                                    selectedOrganizationId = org.id
                                                }) {
                                                    HStack(spacing: 6) {
                                                        if selectedOrganizationId == org.id {
                                                            Image(systemName: "checkmark")
                                                                .font(.system(size: 12, weight: .bold))
                                                        }
                                                        Text(org.nameAr ?? org.name)
                                                            .font(.system(size: 14, weight: .semibold))
                                                            .lineLimit(1)
                                                    }
                                                    .foregroundColor(selectedOrganizationId == org.id ? .white : .primary)
                                                    .padding(.horizontal, 16)
                                                    .padding(.vertical, 10)
                                                    .background(
                                                        selectedOrganizationId == org.id
                                                        ? LinearGradient(
                                                            gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                                            startPoint: .leading,
                                                            endPoint: .trailing
                                                        )
                                                        : LinearGradient(
                                                            gradient: Gradient(colors: [Color(.systemGray5), Color(.systemGray5)]),
                                                            startPoint: .leading,
                                                            endPoint: .trailing
                                                        )
                                                    )
                                                    .cornerRadius(20)
                                                    .shadow(color: selectedOrganizationId == org.id ? Color.systemAccent.opacity(0.3) : Color.clear, radius: 4, x: 0, y: 2)
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
                        
                        // Registrations List
                        if viewModel.registrations.isEmpty {
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
                                
                                Image(systemName: "person.3")
                                    .font(.system(size: 50, weight: .light))
                                    .foregroundColor(.systemAccent)
                            }
                                
                            VStack(spacing: 12) {
                                Text("No Registrations")
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(.systemTextDark)
                                
                                Text("There are no registrations for this event")
                                    .font(.system(size: 15))
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                    .lineSpacing(4)
                                    .padding(.horizontal, 40)
                            }
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else if groupedRegistrations.isEmpty {
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
                                
                                Image(systemName: "magnifyingglass")
                                    .font(.system(size: 50, weight: .light))
                                    .foregroundColor(.systemAccent)
                            }
                                
                            VStack(spacing: 12) {
                                Text("No Results Found")
                                    .font(.system(size: 22, weight: .bold))
                                    .foregroundColor(.systemTextDark)
                                
                                Text("Try adjusting your search or filter criteria")
                                    .font(.system(size: 15))
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                    .lineSpacing(4)
                                    .padding(.horizontal, 40)
                            }
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        } else {
                            ScrollView {
                                LazyVStack(spacing: 16) {
                                    ForEach(Array(groupedRegistrations.enumerated()), id: \.offset) { index, group in
                                        OrganizationGroupView(
                                            group: group,
                                            isExpanded: expandedOrganizations.contains(group.organizationId),
                                            onToggle: {
                                                withAnimation(.easeInOut(duration: 0.2)) {
                                                    if expandedOrganizations.contains(group.organizationId) {
                                                        expandedOrganizations.remove(group.organizationId)
                                                    } else {
                                                        expandedOrganizations.insert(group.organizationId)
                                                    }
                                                }
                                        },
                                        viewModel: viewModel,
                                        selectedRegistrationForSeat: $selectedRegistrationForSeat,
                                        showSeatNumberDialog: $showSeatNumberDialog,
                                        selectedRegistrationForAction: $selectedRegistrationForAction,
                                        showApproveConfirmation: $showApproveConfirmation,
                                        showRejectConfirmation: $showRejectConfirmation,
                                        showFinalApprovalConfirmation: $showFinalApprovalConfirmation
                                        )
                                    }
                                }
                                .padding(.top, 8)
                                .padding(.bottom, 100)
                            }
                        }
                }
                .overlay(
                        // Floating QR Scanner Button
                        VStack {
                            Spacer()
                            HStack {
                                Spacer()
                                Button(action: { showScanOptions = true }) {
                                    Image(systemName: "qrcode.viewfinder")
                                        .font(.system(size: 24, weight: .semibold))
                                        .foregroundColor(.white)
                                        .frame(width: 64, height: 64)
                                        .background(
                                            LinearGradient(
                                                gradient: Gradient(colors: [Color.systemAccent, Color.systemAccentDark]),
                                                startPoint: .topLeading,
                                                endPoint: .bottomTrailing
                                            )
                                        )
                                        .clipShape(Circle())
                                        .shadow(color: Color.systemAccent.opacity(0.4), radius: 12, x: 0, y: 6)
                                        .overlay(Circle().stroke(Color.white, lineWidth: 3))
                                }
                                .padding(.trailing, 20)
                                .padding(.bottom, 20)
                            }
                        }
                    , alignment: .bottomTrailing
                )
            }
        }
        .navigationTitle(event.nameAr ?? event.name)
        .navigationBarTitleDisplayMode(.inline)
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
                    await MainActor.run {
                        isScanningEnabled = false
                        showQRScanner = false
                    }
                }
            }
        }
        .fullScreenCover(isPresented: $showQRScannerForSearch) {
            QRScannerView(isScanningEnabled: .constant(true)) { barcode in
                searchText = barcode
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    showQRScannerForSearch = false
                }
            }
        }
        .alert(viewModel.alertTitle, isPresented: $viewModel.showAlert) {
            if viewModel.showCheckInOutOptions {
                if viewModel.alertTitle.contains("Check Out") {
                    Button("Check-Out") {
                        Task {
                            await viewModel.performCheckOut(barcode: viewModel.scannedBarcode ?? "")
                        }
                    }
                    Button("Cancel", role: .cancel) { }
                } else {
                    Button("Check-In") {
                        Task {
                            await viewModel.performCheckIn(barcode: viewModel.scannedBarcode ?? "")
                        }
                    }
                    Button("Cancel", role: .cancel) { }
                }
            } else {
                Button("OK", role: .cancel) { }
            }
        } message: {
            Text(viewModel.alertMessage)
        }
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
        .task {
            let eventId = event.id ?? 0
            await viewModel.loadRegistrations(eventId: eventId)
        }
    }
}

// MARK: - Organization Group View
struct OrganizationGroupView: View {
    let group: (organization: EventOrganization?, organizationId: Int?, registrations: [EventRegistration])
    let isExpanded: Bool
    let onToggle: () -> Void
    @ObservedObject var viewModel: EventRegistrationsViewModel
    @Binding var selectedRegistrationForSeat: EventRegistration?
    @Binding var showSeatNumberDialog: Bool
    @Binding var selectedRegistrationForAction: EventRegistration?
    @Binding var showApproveConfirmation: Bool
    @Binding var showRejectConfirmation: Bool
    @Binding var showFinalApprovalConfirmation: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Organization Header (Clickable to expand/collapse)
            Button(action: onToggle) {
                HStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.systemAccent.opacity(0.15), Color.systemAccent.opacity(0.05)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 36, height: 36)
                        
                    Image(systemName: "building.2.fill")
                        .foregroundColor(.systemAccent)
                            .font(.system(size: 14, weight: .semibold))
                    }
                    
                    Text(group.organization?.nameAr ?? group.organization?.name ?? "No Organization")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.systemTextDark)
                    
                    Spacer()
                    
                    HStack(spacing: 6) {
                    Text("\(group.registrations.count)")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.systemAccent)
                        .padding(.horizontal, 10)
                            .padding(.vertical, 5)
                            .background(Color.systemAccent.opacity(0.1))
                            .cornerRadius(10)
                    
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .foregroundColor(.systemAccent)
                            .font(.system(size: 12, weight: .bold))
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .background(Color(.systemBackground))
                .cornerRadius(14)
                .shadow(color: Color.systemAccent.opacity(0.08), radius: 6, x: 0, y: 3)
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color.systemAccent.opacity(0.2),
                                    Color.systemAccent.opacity(0.05)
                                ]),
                                startPoint: .leading,
                                endPoint: .trailing
                            ),
                            lineWidth: 1
                        )
                )
            }
            .buttonStyle(PlainButtonStyle())
            
            // Registrations in this group (Collapsible)
            if isExpanded {
                VStack(spacing: 12) {
                    ForEach(group.registrations) { registration in
                        RegistrationRowView(
                            registration: registration,
                            viewModel: viewModel,
                            selectedRegistrationForSeat: $selectedRegistrationForSeat,
                            showSeatNumberDialog: $showSeatNumberDialog,
                            selectedRegistrationForAction: $selectedRegistrationForAction,
                            showApproveConfirmation: $showApproveConfirmation,
                            showRejectConfirmation: $showRejectConfirmation,
                            showFinalApprovalConfirmation: $showFinalApprovalConfirmation
                        )
                            .padding(.horizontal, 16)
                    }
                }
                .padding(.top, 8)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.bottom, 8)
    }
}

// MARK: - Registration Row View
struct RegistrationRowView: View {
    let registration: EventRegistration
    @ObservedObject var viewModel: EventRegistrationsViewModel
    @Binding var selectedRegistrationForSeat: EventRegistration?
    @Binding var showSeatNumberDialog: Bool
    @Binding var selectedRegistrationForAction: EventRegistration?
    @Binding var showApproveConfirmation: Bool
    @Binding var showRejectConfirmation: Bool
    @Binding var showFinalApprovalConfirmation: Bool
    @State private var showMenu = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // HEADER: Name + Status Badge + VIP Badge + Menu
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(spacing: 8) {
                    Text(registration.name)
                        .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.systemTextDark)
                        
                        // VIP Status Badge
                        if let vipStatus = registration.vipStatus, vipStatus != .attendee {
                            HStack(spacing: 4) {
                                Image(systemName: "star.fill")
                                    .font(.system(size: 10, weight: .bold))
                                Text(vipStatus == .vVip ? "V VIP" : "VIP")
                                    .font(.system(size: 10, weight: .bold))
                            }
                            .foregroundColor(.white)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(
                                LinearGradient(
                                    gradient: Gradient(colors: vipStatus == .vVip 
                                        ? [Color.indigo, Color.indigo.opacity(0.8)]
                                        : [Color.purple, Color.purple.opacity(0.8)]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(8)
                        }
                    }
                    
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
                
                // Job Title
                if let jobTitle = registration.jobTitle, !jobTitle.isEmpty {
                    HStack(spacing: 12) {
                        Image(systemName: "briefcase.fill")
                            .foregroundColor(.indigo)
                            .frame(width: 20)
                        
                        Text(jobTitle)
                            .font(.system(size: 14))
                            .foregroundColor(.primary)
                        
                        Spacer()
                    }
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
    
    // VIP Status Label
    private var vipStatusLabel: some View {
        let currentVipStatus = registration.vipStatus ?? VipStatus.attendee
        let labelText: String
        let icon: String
        
        switch currentVipStatus {
        case VipStatus.attendee:
            labelText = "Set VIP Status"
            icon = "person.fill"
        case VipStatus.vip:
            labelText = "VIP"
            icon = "star.fill"
        case VipStatus.vVip:
            labelText = "V VIP"
            icon = "star.fill"
        }
        return Label(labelText, systemImage: icon)
    }
    
    // 3-Dot Menu Content
    @ViewBuilder
    private var menuContent: some View {
        // DRAFT STATUS or NULL STATUS - Show Approve and Reject
        if registration.status == .draft || registration.status == nil {
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
            
            Divider()
            
            // VIP Status Menu
            Menu {
                Button(action: {
                    if let id = registration.id {
                        Task {
                            await viewModel.updateVipStatus(id: id, newVipStatus: VipStatus.attendee)
                        }
                    }
                }) {
                    HStack {
                        Label("Attendee", systemImage: "person.fill")
                        Spacer()
                        if (registration.vipStatus ?? VipStatus.attendee) == VipStatus.attendee {
                            Image(systemName: "checkmark")
                        }
                    }
                }
                
                Button(action: {
                    if let id = registration.id {
                        Task {
                            await viewModel.updateVipStatus(id: id, newVipStatus: VipStatus.vip)
                        }
                    }
                }) {
                    HStack {
                        Label("VIP", systemImage: "star.fill")
                        Spacer()
                        if registration.vipStatus == VipStatus.vip {
                            Image(systemName: "checkmark")
                        }
                    }
                }
                
                Button(action: {
                    if let id = registration.id {
                        Task {
                            await viewModel.updateVipStatus(id: id, newVipStatus: VipStatus.vVip)
                        }
                    }
                }) {
                    HStack {
                        Label("V VIP", systemImage: "star.fill")
                        Spacer()
                        if registration.vipStatus == VipStatus.vVip {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            } label: {
                vipStatusLabel
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
        
        // DRAFT STATUS - Also allow VIP status change
        if registration.status == .draft || registration.status == nil {
            Divider()
            
            // VIP Status Menu
            Menu {
                Button(action: {
                    if let id = registration.id {
                        Task {
                            await viewModel.updateVipStatus(id: id, newVipStatus: VipStatus.attendee)
                        }
                    }
                }) {
                    HStack {
                        Label("Attendee", systemImage: "person.fill")
                        Spacer()
                        if (registration.vipStatus ?? VipStatus.attendee) == VipStatus.attendee {
                            Image(systemName: "checkmark")
                        }
                    }
                }
                
                Button(action: {
                    if let id = registration.id {
                        Task {
                            await viewModel.updateVipStatus(id: id, newVipStatus: VipStatus.vip)
                        }
                    }
                }) {
                    HStack {
                        Label("VIP", systemImage: "star.fill")
                        Spacer()
                        if registration.vipStatus == VipStatus.vip {
                            Image(systemName: "checkmark")
                        }
                    }
                }
                
                Button(action: {
                    if let id = registration.id {
                        Task {
                            await viewModel.updateVipStatus(id: id, newVipStatus: VipStatus.vVip)
                        }
                    }
                }) {
                    HStack {
                        Label("V VIP", systemImage: "star.fill")
                        Spacer()
                        if registration.vipStatus == VipStatus.vVip {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            } label: {
                vipStatusLabel
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
        .padding(.horizontal, 12)
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
        case .draft, .none: return Color.orange  // Treat null as draft
        case .approved: return Color.green
        case .rejected: return Color.red
        }
    }
    
    private var statusText: String {
        switch registration.status {
        case .draft, .none: return "Draft"  // Treat null as draft
        case .approved: return "Approved"
        case .rejected: return "Rejected"
        }
    }
    
    private var statusIcon: String {
        switch registration.status {
        case .draft, .none: return "doc.text.fill"  // Treat null as draft
        case .approved: return "checkmark.seal.fill"
        case .rejected: return "xmark.seal.fill"
        }
    }
    
    private var statusBorderColor: Color {
        switch registration.status {
        case .draft, .none: return Color.orange.opacity(0.3)  // Treat null as draft
        case .approved: return Color.green.opacity(0.3)
        case .rejected: return Color.red.opacity(0.3)
        }
    }
    
    private func formatDateTime(_ dateString: String?) -> String {
        guard let dateString = dateString else {
            return "-"
        }
        
        var date: Date?
        
        // Try ISO8601 with fractional seconds
        let iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        date = iso8601Formatter.date(from: dateString)
        
        // Try ISO8601 without fractional seconds
        if date == nil {
            iso8601Formatter.formatOptions = [.withInternetDateTime]
            date = iso8601Formatter.date(from: dateString)
        }
        
        // Try standard DateFormatter with common formats
        if date == nil {
            let standardFormatter = DateFormatter()
            standardFormatter.locale = Locale(identifier: "en_US_POSIX")
            
            let formats = [
                "yyyy-MM-dd'T'HH:mm:ss.SSSSSSSZ",
                "yyyy-MM-dd'T'HH:mm:ss.SSSSSSZ",
                "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
                "yyyy-MM-dd'T'HH:mm:ssZ",
                "yyyy-MM-dd'T'HH:mm:ss",
                "yyyy-MM-dd HH:mm:ss"
            ]
            
            for format in formats {
                standardFormatter.dateFormat = format
                if let parsedDate = standardFormatter.date(from: dateString) {
            date = parsedDate
                    break
                }
            }
        }
        
        guard let finalDate = date else {
            // If all parsing fails, return a cleaned version
            return dateString.replacingOccurrences(of: "T", with: " ")
                            .replacingOccurrences(of: "Z", with: "")
                            .prefix(19)
                            .description
        }
        
        // Format for display in local timezone
        let displayFormatter = DateFormatter()
        displayFormatter.dateFormat = "dd/MM/yyyy hh:mm a"
        displayFormatter.timeZone = TimeZone.current
        displayFormatter.locale = Locale.current
        
        return displayFormatter.string(from: finalDate)
    }
}

// MARK: - Scan Options View
struct ScanOptionsView: View {
    let onCheckIn: () -> Void
    let onCheckOut: () -> Void
    let onDismiss: () -> Void
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    onDismiss()
                }
            
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

// MARK: - Seat Number Dialog View
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

// MARK: - View Model
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
            errorMessage = nil
        }
        
        do {
            print("🔵 Loading registrations for eventId: \(eventId)")
            let loadedRegistrations = try await APIService.shared.getEventRegistrations(eventId: eventId)
            print("✅ Successfully loaded \(loadedRegistrations.count) registrations")
            await MainActor.run {
                registrations = loadedRegistrations
                isLoading = false
                errorMessage = nil
            }
        } catch {
            print("❌ Error loading registrations: \(error)")
            if let apiError = error as? APIError {
                print("❌ API Error: \(apiError.errorDescription ?? "Unknown")")
            }
            await MainActor.run {
                if let apiError = error as? APIError {
                    errorMessage = apiError.errorDescription
                } else {
                    errorMessage = error.localizedDescription
                }
                isLoading = false
                // Show alert for debugging
                alertTitle = "Error Loading Registrations"
                alertMessage = error.localizedDescription
                showAlert = true
            }
        }
    }
    
    func handleScan(barcode: String) async {
        await MainActor.run {
            scannedBarcode = barcode
        }
        
        if let registration = registrations.first(where: { $0.barcode == barcode }) {
            await MainActor.run {
                if registration.isCheckedIn && !registration.isCheckedOut {
                    alertTitle = "Scan Result - Check Out"
                    alertMessage = "\(registration.name) is already checked in.\n\nWould you like to check out?"
                    showCheckInOutOptions = true
                    showAlert = true
                } else if registration.isCheckedOut {
                    alertTitle = "Scan Result"
                    alertMessage = "\(registration.name) is already checked out."
                    showCheckInOutOptions = false
                    showAlert = true
                } else {
                    alertTitle = "Scan Result - Check In"
                    alertMessage = "\(registration.name) is not checked in.\n\nWould you like to check in?"
                    showCheckInOutOptions = true
                    showAlert = true
                }
            }
        } else {
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
    
    // MARK: - Registration Management Functions
    
    func approveRegistration(id: Int) async {
        do {
            let updatedRegistration = try await APIService.shared.approveRegistration(id: id)
            await MainActor.run {
                // Update the registration in the list
                if let index = registrations.firstIndex(where: { $0.id == id }) {
                    registrations[index] = updatedRegistration
                }
                alertTitle = "Success"
                alertMessage = "Registration approved and confirmation email sent successfully."
                showAlert = true
            }
        } catch {
            await MainActor.run {
                alertTitle = "Approval Error"
                if let apiError = error as? APIError {
                    alertMessage = apiError.errorDescription ?? "Approval failed"
                } else {
                    alertMessage = error.localizedDescription
                }
                showAlert = true
            }
        }
    }
    
    func rejectRegistration(id: Int) async {
        do {
            let updatedRegistration = try await APIService.shared.rejectRegistration(id: id)
            await MainActor.run {
                // Update the registration in the list
                if let index = registrations.firstIndex(where: { $0.id == id }) {
                    registrations[index] = updatedRegistration
                }
                alertTitle = "Success"
                alertMessage = "Registration rejected successfully."
                showAlert = true
            }
        } catch {
            await MainActor.run {
                alertTitle = "Rejection Error"
                if let apiError = error as? APIError {
                    alertMessage = apiError.errorDescription ?? "Rejection failed"
                } else {
                    alertMessage = error.localizedDescription
                }
                showAlert = true
            }
        }
    }
    
    func updateSeatNumber(id: Int, seatNumber: String?) async {
        do {
            let updatedRegistration = try await APIService.shared.updateSeatNumber(id: id, seatNumber: seatNumber)
            await MainActor.run {
                // Update the registration in the list
                if let index = registrations.firstIndex(where: { $0.id == id }) {
                    registrations[index] = updatedRegistration
                }
                alertTitle = "Success"
                alertMessage = "Seat number updated successfully."
                showAlert = true
            }
        } catch {
            await MainActor.run {
                alertTitle = "Seat Number Error"
                if let apiError = error as? APIError {
                    alertMessage = apiError.errorDescription ?? "Seat number update failed"
                } else {
                    alertMessage = error.localizedDescription
                }
                showAlert = true
            }
        }
    }
    
    func sendFinalApprovalEmail(id: Int) async {
        do {
            let updatedRegistration = try await APIService.shared.sendFinalApprovalEmail(id: id)
            await MainActor.run {
                // Update the registration in the list
                if let index = registrations.firstIndex(where: { $0.id == id }) {
                    registrations[index] = updatedRegistration
                }
                alertTitle = "Success"
                alertMessage = "Final approval email sent successfully with badge and agenda."
                showAlert = true
            }
        } catch {
            await MainActor.run {
                alertTitle = "Email Error"
                if let apiError = error as? APIError {
                    alertMessage = apiError.errorDescription ?? "Failed to send final approval email"
                } else {
                    alertMessage = error.localizedDescription
                }
                showAlert = true
            }
        }
    }
    
    func updateVipStatus(id: Int, newVipStatus: VipStatus) async {
        do {
            let updatedRegistration = try await APIService.shared.updateRegistration(id: id, vipStatus: newVipStatus)
            await MainActor.run {
                // Update the registration in the list
                if let index = registrations.firstIndex(where: { $0.id == id }) {
                    registrations[index] = updatedRegistration
                }
                alertTitle = "Success"
                let statusText: String
                switch newVipStatus {
                case .attendee:
                    statusText = "Attendee"
                case .vip:
                    statusText = "VIP"
                case .vVip:
                    statusText = "V VIP"
                }
                alertMessage = "VIP status updated to \(statusText) successfully."
                showAlert = true
            }
        } catch {
            await MainActor.run {
                alertTitle = "VIP Status Error"
                if let apiError = error as? APIError {
                    alertMessage = apiError.errorDescription ?? "Failed to update VIP status"
                } else {
                    alertMessage = error.localizedDescription
                }
                showAlert = true
            }
        }
    }
}
