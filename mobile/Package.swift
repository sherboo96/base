// swift-tools-version: 5.7
import PackageDescription

let package = Package(
    name: "mobile",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "mobile",
            targets: ["mobile"]),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "mobile",
            dependencies: []),
    ]
)

