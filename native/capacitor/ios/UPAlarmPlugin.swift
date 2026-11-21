import Foundation
import Capacitor
import AlarmKit
import SwiftUI

@available(iOS 26.0, *)
private struct UPAlarmMetadata: AlarmMetadata {
    var label: String
}

@objc(UPAlarmPlugin)
public class UPAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UPAlarmPlugin"
    public let jsName = "UPAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "capabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "test", returnType: CAPPluginReturnPromise)
    ]

    @objc func capabilities(_ call: CAPPluginCall) {
        if #available(iOS 26.0, *) {
            let authorized = AlarmManager.shared.authorizationState == .authorized
            call.resolve(["platform": "ios", "nativeAlarmSupported": true, "exactScheduling": true,
                          "requiresPermission": true, "permissionGranted": authorized,
                          "notes": [authorized ? "AlarmKit authorization is granted." : "Authorize UP to schedule system alarms."]])
        } else {
            call.resolve(["platform": "ios", "nativeAlarmSupported": false, "exactScheduling": false,
                          "requiresPermission": false, "permissionGranted": false,
                          "notes": ["AlarmKit requires iOS 26 or later."]])
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else {
            call.resolve(["platform": "ios", "nativeAlarmSupported": false, "exactScheduling": false,
                          "requiresPermission": false, "permissionGranted": false, "notes": ["AlarmKit requires iOS 26 or later."]])
            return
        }
        Task {
            do {
                let state = try await AlarmManager.shared.requestAuthorization()
                call.resolve(["platform": "ios", "nativeAlarmSupported": true, "exactScheduling": true,
                              "requiresPermission": true, "permissionGranted": state == .authorized,
                              "notes": [state == .authorized ? "AlarmKit authorization granted." : "Authorization was not granted."]])
            } catch { call.reject("Could not request AlarmKit authorization: \(error.localizedDescription)") }
        }
    }

    @objc func schedule(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else {
            call.resolve(["state": "unsupported", "message": "AlarmKit requires iOS 26 or later."]); return
        }
        guard let alarm = call.getObject("alarm"), let idString = alarm["id"] as? String,
              let nextString = call.getString("nextOccurrence"),
              let instant = ISO8601DateFormatter().date(from: nextString) else {
            call.reject("Alarm payload or next occurrence is invalid."); return
        }
        guard AlarmManager.shared.authorizationState == .authorized else {
            call.resolve(["state": "permission_required", "message": "Allow UP to schedule alarms in iOS Settings."]); return
        }
        let repeatDays = alarm["repeatDays"] as? [Int] ?? [];
        if !repeatDays.isEmpty {
            call.resolve(["state": "unsupported", "message": "This iOS bridge currently schedules one occurrence only. Weekly recurrence and target-timezone replenishment are not yet implemented."])
            return
        }
        Task {
            do {
                let id = UUID(uuidString: idString) ?? UUID()
                let label = (alarm["label"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? "Time to get up"
                let stop = AlarmButton(text: "Stop", textColor: .white, systemImageName: "stop.circle")
                let alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: label), stopButton: stop)
                let attributes = AlarmAttributes<UPAlarmMetadata>(
                    presentation: AlarmPresentation(alert: alert),
                    metadata: UPAlarmMetadata(label: label),
                    tintColor: Color(red: 0.09, green: 0.24, blue: 0.26))
                let configuration = AlarmManager.AlarmConfiguration<UPAlarmMetadata>(
                    schedule: .fixed(instant), attributes: attributes)
                try await AlarmManager.shared.schedule(id: id, configuration: configuration)
                call.resolve(["state": "scheduled", "message": "Scheduled with Apple AlarmKit."])
            } catch { call.resolve(["state": "failed", "message": error.localizedDescription]) }
        }
    }

    @objc func cancel(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.resolve(); return }
        guard let id = call.getString("alarmId").flatMap(UUID.init(uuidString:)) else {
            call.reject("Alarm ID must be a UUID for iOS AlarmKit."); return
        }
        Task {
            do { try await AlarmManager.shared.cancel(id: id); call.resolve() }
            catch { call.reject("Could not cancel alarm: \(error.localizedDescription)") }
        }
    }

    @objc func test(_ call: CAPPluginCall) {
        guard #available(iOS 26.0, *) else { call.reject("AlarmKit requires iOS 26 or later."); return }
        let id = UUID()
        let stop = AlarmButton(text: "Stop", textColor: .white, systemImageName: "stop.circle")
        let alert = AlarmPresentation.Alert(title: "UP test alarm", stopButton: stop)
        let attributes = AlarmAttributes<UPAlarmMetadata>(
            presentation: AlarmPresentation(alert: alert),
            metadata: UPAlarmMetadata(label: "UP test alarm"),
            tintColor: Color(red: 0.09, green: 0.24, blue: 0.26))
        let configuration = AlarmManager.AlarmConfiguration<UPAlarmMetadata>(
            schedule: .fixed(Date().addingTimeInterval(60)), attributes: attributes)
        Task {
            do { try await AlarmManager.shared.schedule(id: id, configuration: configuration); call.resolve() }
            catch { call.reject("Could not schedule test alarm: \(error.localizedDescription)") }
        }
    }
}
