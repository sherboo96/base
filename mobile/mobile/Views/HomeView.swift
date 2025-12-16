import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @State private var selectedEvent: Event?
    @State private var showRegistrations = false
    
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
                        Text("Loading events...")
                            .font(.system(size: 16, weight: .medium))
                            .foregroundColor(.secondary)
                    }
                } else if viewModel.events.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "calendar.badge.exclamationmark")
                            .font(.system(size: 60))
                            .foregroundColor(.gray.opacity(0.5))
                        
                        Text("No Active Events")
                            .font(.system(size: 22, weight: .semibold))
                            .foregroundColor(.primary)
                        
                        Text("There are no published events at the moment")
                            .font(.system(size: 15))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 40)
                    }
                } else {
                    ScrollView {
                        VStack(spacing: 16) {
                            // Header Card
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Active Events")
                                            .font(.system(size: 28, weight: .bold))
                                            .foregroundColor(.primary)
                                        
                                        Text("\(viewModel.events.count) event\(viewModel.events.count == 1 ? "" : "s") available")
                                            .font(.system(size: 15))
                                            .foregroundColor(.secondary)
                                    }
                                    
                                    Spacer()
                                    
                                    // Logo
                                    Image("logo")
                                        .resizable()
                                        .scaledToFit()
                                        .frame(width: 50, height: 50)
                                        .clipShape(Circle())
                                        .overlay(Circle().stroke(Color.blue.opacity(0.2), lineWidth: 2))
                                }
                            }
                            .padding(20)
                            .background(Color(.systemBackground))
                            .cornerRadius(16)
                            .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 2)
                            .padding(.horizontal, 16)
                            .padding(.top, 8)
                            
                            // Events List
                            LazyVStack(spacing: 12) {
                                ForEach(viewModel.events) { event in
                                    EventCardView(event: event)
                                        .onTapGesture {
                                            selectedEvent = event
                                            showRegistrations = true
                                        }
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.bottom, 20)
                        }
                        .padding(.top, 8)
                    }
                    .refreshable {
                        await viewModel.loadEvents()
                    }
                }
            }
            .navigationTitle("")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        APIService.shared.logout()
                        NotificationCenter.default.post(name: NSNotification.Name("UserLoggedOut"), object: nil)
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                            Text("Logout")
                                .font(.system(size: 15, weight: .medium))
                        }
                        .foregroundColor(.red)
                    }
                }
            }
            .fullScreenCover(item: $selectedEvent) { event in
                EventRegistrationsView(event: event)
            }
            .task {
                await viewModel.loadEvents()
            }
        }
    }
}

struct EventCardView: View {
    let event: Event
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Event Name
            VStack(alignment: .leading, spacing: 6) {
                Text(event.name)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                
                if let nameAr = event.nameAr, !nameAr.isEmpty {
                    Text(nameAr)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
            }
            
            Divider()
                .padding(.vertical, 4)
            
            // Event Details
            VStack(spacing: 10) {
                if let date = event.date {
                    HStack(spacing: 12) {
                        Image(systemName: "calendar")
                            .foregroundColor(.blue)
                            .frame(width: 20)
                        
                        Text(date)
                            .font(.system(size: 15))
                            .foregroundColor(.primary)
                        
                        Spacer()
                    }
                }
                
                if let location = event.location?.name {
                    HStack(spacing: 12) {
                        Image(systemName: "location.fill")
                            .foregroundColor(.red)
                            .frame(width: 20)
                        
                        Text(location)
                            .font(.system(size: 15))
                            .foregroundColor(.primary)
                            .lineLimit(2)
                        
                        Spacer()
                    }
                }
                
                if let code = event.code as String? {
                    HStack(spacing: 12) {
                        Image(systemName: "barcode")
                            .foregroundColor(.green)
                            .frame(width: 20)
                        
                        Text("Code: \(code)")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.secondary)
                        
                        Spacer()
                    }
                }
            }
            
            // Action Indicator
            HStack {
                Spacer()
                
                HStack(spacing: 6) {
                    Text("View Registrations")
                        .font(.system(size: 14, weight: .semibold))
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(.blue)
            }
            .padding(.top, 4)
        }
        .padding(18)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.08), radius: 8, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.blue.opacity(0.1), lineWidth: 1)
        )
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
