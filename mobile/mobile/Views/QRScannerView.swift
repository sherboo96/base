import SwiftUI
import AVFoundation
import AudioToolbox

struct QRScannerView: View {
    @Binding var isScanningEnabled: Bool
    let onQRCodeScanned: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        ZStack {
            QRScannerViewControllerRepresentable(isScanningEnabled: $isScanningEnabled, onQRCodeScanned: onQRCodeScanned)
                .ignoresSafeArea()
            
            // Close button at top
            VStack {
                HStack {
                    Spacer()
                    Button(action: {
                        isScanningEnabled = false
                        dismiss()
                    }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(.white)
                            .background(Color.black.opacity(0.5))
                            .clipShape(Circle())
                    }
                    .padding(.top, 20)
                    .padding(.trailing, 20)
                }
                Spacer()
            }
        }
    }
}

struct QRScannerViewControllerRepresentable: UIViewControllerRepresentable {
    @Binding var isScanningEnabled: Bool
    let onQRCodeScanned: (String) -> Void
    
    func makeUIViewController(context: Context) -> QRScannerViewController {
        let controller = QRScannerViewController()
        controller.delegate = context.coordinator
        return controller
    }
    
    func updateUIViewController(_ uiViewController: QRScannerViewController, context: Context) {
        if isScanningEnabled {
            uiViewController.startScanning()
        } else {
            uiViewController.stopScanning()
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(onQRCodeScanned: onQRCodeScanned)
    }
    
    class Coordinator: NSObject, QRScannerDelegate {
        let onQRCodeScanned: (String) -> Void
        
        init(onQRCodeScanned: @escaping (String) -> Void) {
            self.onQRCodeScanned = onQRCodeScanned
        }
        
        func didScanQRCode(_ code: String) {
            onQRCodeScanned(code)
        }
    }
}

protocol QRScannerDelegate: AnyObject {
    func didScanQRCode(_ code: String)
}

class QRScannerViewController: UIViewController {
    weak var delegate: QRScannerDelegate?
    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupCamera()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if isScanningEnabled {
            startScanning()
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopScanning()
    }
    
    private var isScanningEnabled = false
    
    func startScanning() {
        isScanningEnabled = true
        if captureSession?.isRunning == false {
            DispatchQueue.global(qos: .userInitiated).async { [weak self] in
                self?.captureSession?.startRunning()
            }
        }
    }
    
    func stopScanning() {
        isScanningEnabled = false
        captureSession?.stopRunning()
    }
    
    private func setupCamera() {
        guard let videoCaptureDevice = AVCaptureDevice.default(for: .video) else {
            return
        }
        
        let videoInput: AVCaptureDeviceInput
        
        do {
            videoInput = try AVCaptureDeviceInput(device: videoCaptureDevice)
        } catch {
            return
        }
        
        captureSession = AVCaptureSession()
        
        if captureSession?.canAddInput(videoInput) ?? false {
            captureSession?.addInput(videoInput)
        } else {
            return
        }
        
        let metadataOutput = AVCaptureMetadataOutput()
        
        if captureSession?.canAddOutput(metadataOutput) ?? false {
            captureSession?.addOutput(metadataOutput)
            
            metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
            metadataOutput.metadataObjectTypes = [.qr]
        } else {
            return
        }
        
        previewLayer = AVCaptureVideoPreviewLayer(session: captureSession!)
        previewLayer?.frame = view.layer.bounds
        previewLayer?.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer!)
        
        // Add overlay view
        let overlayView = UIView()
        overlayView.frame = view.bounds
        overlayView.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        view.addSubview(overlayView)
        
        // Add scanning frame
        let scanningFrame = UIView()
        scanningFrame.frame = CGRect(x: view.bounds.width / 2 - 150, y: view.bounds.height / 2 - 150, width: 300, height: 300)
        scanningFrame.layer.borderColor = UIColor.green.cgColor
        scanningFrame.layer.borderWidth = 2
        scanningFrame.backgroundColor = UIColor.clear
        view.addSubview(scanningFrame)
        
        // Add instruction label
        let instructionLabel = UILabel()
        instructionLabel.text = "Position QR code within the frame"
        instructionLabel.textColor = .white
        instructionLabel.textAlignment = .center
        instructionLabel.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        instructionLabel.frame = CGRect(x: 0, y: scanningFrame.frame.maxY + 30, width: view.bounds.width, height: 30)
        view.addSubview(instructionLabel)
        
        // Add title label at top center
        let titleLabel = UILabel()
        titleLabel.text = "Scan QR Code"
        titleLabel.textColor = .white
        titleLabel.textAlignment = .center
        titleLabel.font = UIFont.systemFont(ofSize: 24, weight: .bold)
        titleLabel.frame = CGRect(x: 0, y: 60, width: view.bounds.width, height: 40)
        view.addSubview(titleLabel)
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.layer.bounds
    }
}

extension QRScannerViewController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        if let metadataObject = metadataObjects.first {
            guard let readableObject = metadataObject as? AVMetadataMachineReadableCodeObject else { return }
            guard let stringValue = readableObject.stringValue else { return }
            
            AudioServicesPlaySystemSound(SystemSoundID(kSystemSoundID_Vibrate))
            delegate?.didScanQRCode(stringValue)
            
            // Stop scanning after successful scan
            stopScanning()
        }
    }
}

