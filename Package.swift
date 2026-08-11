// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TarelogShortcuts",
    platforms: [.macOS(.v13)],
    dependencies: [
        .package(url: "https://github.com/a2/swift-shortcuts.git", exact: "1.0.0"),
    ],
    targets: [
        .executableTarget(
            name: "TarelogAppleHealthShortcut",
            dependencies: [.product(name: "SwiftShortcuts", package: "swift-shortcuts")],
            path: "scripts",
            sources: ["apple-health-shortcut.swift"]
        ),
    ]
)
