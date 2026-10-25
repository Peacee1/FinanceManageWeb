import SwiftUI
import WidgetKit

struct TaskNoteEntry: TimelineEntry {
  let date: Date
  let props: [String: Any]
}
struct TaskNoteProvider: TimelineProvider {
  func placeholder(in context: Context) -> TaskNoteEntry {TaskNoteEntry(date: Date(), props: [:])}
  private func current() -> TaskNoteEntry {
    let group = Bundle.main.object(forInfoDictionaryKey: "ExpoWidgetsAppGroupIdentifier") as? String
    let defaults = group.flatMap {UserDefaults(suiteName: $0)}
    let rows = defaults?.array(forKey: "__expo_widgets_TaskNoteWidget_timeline") as? [[String: Any]] ?? []
    let now = Date().timeIntervalSince1970 * 1000
    let latest = rows.filter {(($0["timestamp"] as? NSNumber)?.doubleValue ?? 0) <= now}
      .max {(($0["timestamp"] as? NSNumber)?.doubleValue ?? 0) < (($1["timestamp"] as? NSNumber)?.doubleValue ?? 0)}
    return TaskNoteEntry(date: Date(), props: latest?["props"] as? [String: Any] ?? [:])
  }
  func getSnapshot(in context: Context, completion: @escaping (TaskNoteEntry) -> Void) {completion(current())}
  func getTimeline(in context: Context, completion: @escaping (Timeline<TaskNoteEntry>) -> Void) {
    completion(Timeline(entries: [current()], policy: .after(Date().addingTimeInterval(900))))
  }
}
struct TaskNoteView: View {
  @Environment(\.widgetFamily) private var family
  let entry: TaskNoteEntry
  private let ink = Color(red: 0.098, green: 0.098, blue: 0.094)
  private let paper = Color(red: 0.945, green: 0.941, blue: 0.925)
  private let muted = Color(red: 0.42, green: 0.42, blue: 0.40)
  private var items: [[String: Any]] {entry.props["items"] as? [[String: Any]] ?? []}
  private var signedIn: Bool {entry.props["signedIn"] as? Bool ?? false}
  private var limit: Int {family == .systemSmall ? 2 : family == .systemMedium ? 3 : 7}
  private var content: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(alignment: .center) {
        VStack(alignment: .leading, spacing: 3) {
          Text("VIỆC CẦN LÀM").font(.system(size: 10, weight: .semibold)).tracking(1.4)
          Text(entry.date, format: .dateTime.day().month()).font(.system(size: 12, design: .serif)).foregroundStyle(muted)
        }
        Spacer(minLength: 0)
        Image(systemName: "paperclip").font(.system(size: 22, weight: .light)).rotationEffect(.degrees(-18))
      }
      Rectangle().fill(ink.opacity(0.2)).frame(height: 1)
      if items.isEmpty {
        Text(signedIn ? "Một ngày nhẹ nhàng.\nThêm việc mới trong app." : "Mở Peacee1 Task\nđể đồng bộ công việc.")
          .font(.system(size: 13, design: .serif)).foregroundStyle(muted).lineSpacing(5)
      } else {
        ForEach(Array(items.prefix(limit).enumerated()), id: \.offset) {_, item in
          VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
              Image(systemName: (item["done"] as? Bool ?? false) ? "checkmark.circle.fill" : "circle").font(.system(size: 10, weight: .light))
              Text(item["title"] as? String ?? "").font(.system(size: 13, design: .serif)).lineLimit(1)
                .strikethrough(item["done"] as? Bool ?? false, color: muted)
                .foregroundStyle((item["done"] as? Bool ?? false) ? muted : ink)
            }
            Rectangle().fill(ink.opacity(0.09)).frame(height: 0.5)
          }
        }
      }
      Spacer(minLength: 0)
      HStack {
        Text("Peacee1 Task").font(.system(size: 9, weight: .medium)).foregroundStyle(muted)
        Spacer(minLength: 0)
        if let total = entry.props["total"] as? Int, total > limit {Text("+\(total - limit) việc khác").font(.system(size: 10)).foregroundStyle(muted)}
      }
    }.padding(16).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).foregroundStyle(ink)
  }
  @ViewBuilder var body: some View {
    if #available(iOS 17.0, *) {content.containerBackground(paper, for: .widget)}
    else {content.background(paper)}
  }
}
struct TaskNoteWidget: Widget {
  private var configuration: some WidgetConfiguration {
    StaticConfiguration(kind: "TaskNoteWidget", provider: TaskNoteProvider()) {entry in
      TaskNoteView(entry: entry).widgetURL(URL(string: "peacee1task:///"))
    }.configurationDisplayName("Tờ note").description("Những việc cần làm trên một tờ ghi chú.")
      .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
  @WidgetConfigurationBuilder var body: some WidgetConfiguration {
    if #available(iOS 17.0, *) {configuration.contentMarginsDisabled()}
    else {configuration}
  }
}
