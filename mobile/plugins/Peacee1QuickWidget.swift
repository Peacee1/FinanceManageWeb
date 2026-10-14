import SwiftUI
import WidgetKit

struct Peacee1Entry: TimelineEntry {
  let date: Date
  let props: [String: Any]
}

struct Peacee1Provider: TimelineProvider {
  func placeholder(in context: Context) -> Peacee1Entry {
    Peacee1Entry(date: Date(), props: [:])
  }
  private func current() -> Peacee1Entry {
    let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String
    let defaults = group.flatMap { UserDefaults(suiteName: $0) }
    let rows = defaults?.array(forKey: "__expo_widgets_Peacee1QuickWidget_timeline") as? [[String: Any]] ?? []
    let now = Date().timeIntervalSince1970 * 1000
    let latest = rows.filter { (($0["timestamp"] as? NSNumber)?.doubleValue ?? 0) <= now }
      .max { (($0["timestamp"] as? NSNumber)?.doubleValue ?? 0) < (($1["timestamp"] as? NSNumber)?.doubleValue ?? 0) }
    return Peacee1Entry(date: Date(), props: latest?["props"] as? [String: Any] ?? [:])
  }
  func getSnapshot(in context: Context, completion: @escaping (Peacee1Entry) -> Void) {
    completion(current())
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Peacee1Entry>) -> Void) {
    completion(Timeline(entries: [current()], policy: .after(Date().addingTimeInterval(900))))
  }
}

struct Peacee1WidgetView: View {
  @Environment(\.widgetFamily) private var family
  let entry: Peacee1Entry
  private var palette: [String: String] { entry.props["palette"] as? [String: String] ?? [:] }
  private func color(_ key: String, _ fallback: String) -> Color {
    let hex = (palette[key] ?? fallback).replacingOccurrences(of: "#", with: "")
    let value = UInt64(hex, radix: 16) ?? 0x191918
    return Color(red: Double((value >> 16) & 255)/255, green: Double((value >> 8) & 255)/255, blue: Double(value & 255)/255)
  }
  private func label(_ key: String, _ fallback: String) -> String { entry.props[key] as? String ?? fallback }
  private var ink: Color { color("primary", "#191918") }
  private var text: Color { color("text", "#191918") }
  private var surface: Color { color("card", "#FFFFFF") }
  private var button: Color { color("bg", "#F1F0EC") }
  private var heading: some View {
    HStack(spacing: 6) {
      Image(systemName: "creditcard")
      Text("Peacee1").font(.system(size: 17, weight: .bold))
      Spacer(minLength: 0)
    }.foregroundStyle(ink)
  }
  private func action(_ key: String, _ fallback: String, _ icon: String, _ destination: String, horizontal: Bool = false) -> some View {
    Link(destination: URL(string: destination)!) {
      Group {
        if horizontal {
          HStack(spacing: 10) { symbol(icon); Text(label(key, fallback)).font(.system(size: 13, weight: .semibold)); Spacer(minLength: 0) }
        } else {
          VStack(spacing: 8) { symbol(icon); Text(label(key, fallback)).font(.system(size: 11, weight: .semibold)).multilineTextAlignment(.center).lineLimit(2) }.frame(maxWidth: .infinity)
        }
      }.foregroundStyle(text)
    }
  }
  private func symbol(_ name: String) -> some View {
    Image(systemName: name).font(.system(size: 23, weight: .medium)).foregroundStyle(ink)
      .frame(width: 44, height: 44).background(button, in: RoundedRectangle(cornerRadius: 14))
  }
  private var content: some View {
    VStack(alignment: .leading, spacing: 16) {
      heading
      if family == .systemSmall {
        action("expense", "Add expense", "plus", "peacee1:///home?action=expense")
      } else if family == .systemLarge {
        HStack(alignment: .center, spacing: 12) {
          VStack(spacing: 14) {
            action("expense", "Add expense", "plus", "peacee1:///home?action=expense", horizontal: true)
            action("scan", "Scan QR", "qrcode.viewfinder", "peacee1:///home?action=qr", horizontal: true)
            action("calendar", "Calendar", "calendar", "peacee1:///calendar", horizontal: true)
          }.frame(maxWidth: .infinity)
          Link(destination: URL(string: "peacee1:///calendar")!) {
            VStack(spacing: 10) {
              Image(systemName: "chart.bar").font(.system(size: 24)).foregroundStyle(ink)
              Text(label("todayLabel", "Today’s spending")).font(.system(size: 12))
              Text(label("todayAmount", "—")).font(.system(size: 20, weight: .bold)).minimumScaleFactor(0.6).lineLimit(1)
              Text(label("updatedDate", "")).font(.system(size: 10))
            }.foregroundStyle(text).padding(12).frame(maxWidth: .infinity).background(button, in: RoundedRectangle(cornerRadius: 18))
          }
        }
      } else {
        HStack(spacing: 10) {
          action("expense", "Add expense", "plus", "peacee1:///home?action=expense")
          action("scan", "Scan QR", "qrcode.viewfinder", "peacee1:///home?action=qr")
          action("calendar", "Calendar", "calendar", "peacee1:///calendar")
        }
      }
    }.padding(16).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
  }
  @ViewBuilder var body: some View {
    if #available(iOS 17.0, *) { content.containerBackground(surface, for: .widget) }
    else { content.background(surface) }
  }
}

struct Peacee1QuickWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "Peacee1QuickWidget", provider: Peacee1Provider()) { entry in
      Peacee1WidgetView(entry: entry)
    }
    .configurationDisplayName("Peacee1")
    .description("Quick expense, QR payment and calendar")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    .contentMarginsDisabled()
  }
}
