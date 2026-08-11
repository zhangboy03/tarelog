import Foundation
import SwiftShortcuts

private typealias Quantity = HealthMeasurement.Count

private let arguments = Array(CommandLine.arguments.dropFirst())

guard arguments.count == 3,
      let endpoint = URL(string: arguments[1]),
      endpoint.scheme == "https",
      !arguments[2].isEmpty else {
    FileHandle.standardError.write(Data("Usage: TarelogAppleHealthShortcut <output.shortcut> <https-endpoint/api/health-sync> <token>\n".utf8))
    exit(2)
}

private let output = arguments[0]
private let syncToken = arguments[2]
private let syncEndpoint = endpoint.absoluteString
private let syncHeaders: KeyValuePairs<Text, Text> = ["X-Health-Sync-Token": Text(syncToken)]

private func value(_ record: Variable, _ key: String) -> Variable {
    record.withValue(for: key)
}

private func logNutrient(_ record: Variable, key: String, type: String, unit: String) -> some Shortcut {
    LogHealthSample<Quantity>(
        type: HealthSampleType(type),
        magnitude: value(record, key),
        unit: HealthSampleUnit(unit),
        date: "\(value(record, "date"))"
    )
}

private func syncNutrient(_ response: Variable, key: String, type: String, unit: String) -> some Shortcut {
    Repeat(iterating: response.withValue(for: key)) { _, record in
        ShortcutGroup {
            logNutrient(record, key: key, type: type, unit: unit)
            GetContentsOfURL(
                method: .POST,
                url: Text(syncEndpoint),
                headers: syncHeaders,
                body: .json([
                    "id": "\(value(record, "id"))",
                    "nutrient": .string(Text(key)),
                ])
            )
        }
    }
}

struct TarelogAppleHealthShortcut: Shortcut {
    var body: some Shortcut {
        GetContentsOfURL(
            method: .GET,
            url: Text(syncEndpoint),
            headers: syncHeaders,
            body: nil
        ).usingResult { response in
            ShortcutGroup {
                syncNutrient(response, key: "calories", type: "Dietary Energy", unit: "kcal")
                syncNutrient(response, key: "protein", type: "Protein", unit: "g")
                syncNutrient(response, key: "carbs", type: "Carbohydrates", unit: "g")
                syncNutrient(response, key: "fat", type: "Total Fat", unit: "g")
                syncNutrient(response, key: "fiber", type: "Fiber", unit: "g")
                syncNutrient(response, key: "sugar", type: "Sugar", unit: "g")
                syncNutrient(response, key: "saturatedFat", type: "Saturated Fat", unit: "g")
                syncNutrient(response, key: "sodium", type: "Sodium", unit: "mg")
                syncNutrient(response, key: "caffeine", type: "Caffeine", unit: "mg")
            }
            ShowResult("Tarelog 今日新增同步完成：\(response.withValue(for: "count")) 笔。没有新增时不会重复写入。")
        }
    }
}

try TarelogAppleHealthShortcut().build().write(to: URL(fileURLWithPath: output))
