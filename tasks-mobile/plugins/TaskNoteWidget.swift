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
  private let ink = Color(red: 0.10, green: 0.10, blue: 0.095)
  private let paper = Color(red: 0.97, green: 0.96, blue: 0.93)
  private let muted = Color(red: 0.48, green: 0.47, blue: 0.43)
  private var items: [[String: Any]] {entry.props["items"] as? [[String: Any]] ?? []}
  private var signedIn: Bool {entry.props["signedIn"] as? Bool ?? false}
  private var limit: Int {family == .systemSmall ? 2 : family == .systemMedium ? 3 : 7}
  private var total: Int {entry.props["total"] as? Int ?? items.count}
  private var content: some View {
    VStack(alignment: .leading, spacing: family == .systemLarge ? 12 : 8) {
      HStack(alignment: .firstTextBaseline) {
        Text("Việc cần làm").font(.system(size: family == .systemSmall ? 16 : 18, weight: .semibold, design: .rounded))
        Spacer(minLength: 4)
        if family != .systemSmall {
          Text(entry.date, format: .dateTime.day().month()).font(.system(size: 11, weight: .medium)).foregroundStyle(muted)
        }
      }
      Rectangle().fill(ink.opacity(0.16)).frame(height: 1)
      if items.isEmpty {
        VStack(alignment: .leading, spacing: 6) {
          Text(signedIn ? "Đã xong mọi việc?" : "Ghi chú của bạn")
            .font(.system(size: 14, weight: .medium, design: .rounded))
          Text(signedIn ? "Thêm công việc để bắt đầu." : "Mở app một lần để\nđồng bộ danh sách.")
            .font(.system(size: 12)).foregroundStyle(muted).lineSpacing(3)
        }.padding(.top, 4)
      } else {
        ForEach(Array(items.prefix(limit).enumerated()), id: \.offset) {_, item in
          let done = item["done"] as? Bool ?? false
          VStack(alignment: .leading, spacing: family == .systemLarge ? 10 : 6) {
            HStack(alignment: .firstTextBaseline, spacing: 9) {
              Image(systemName: done ? "checkmark.circle.fill" : "circle")
                .font(.system(size: 13, weight: .regular)).foregroundStyle(done ? muted : ink)
              Text(item["title"] as? String ?? "")
                .font(.system(size: 14, weight: .regular, design: .rounded))
                .strikethrough(done, color: muted).foregroundStyle(done ? muted : ink)
                .lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
            }
            Rectangle().fill(ink.opacity(0.08)).frame(height: 0.5)
          }
        }
      }
      Spacer(minLength: 0)
      HStack {
        Text("PEACEE1 TASK").font(.system(size: 8, weight: .semibold)).tracking(1)
        Spacer(minLength: 0)
        if total > limit {
          Text("+\(total - limit) việc").font(.system(size: 10, weight: .medium))
        }
      }.foregroundStyle(muted)
    }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).foregroundStyle(ink)
  }
  @ViewBuilder var body: some View {
    if #available(iOS 17.0, *) {content.containerBackground(paper, for: .widget)}
    else {content.padding(14).background(paper)}
  }
}
struct TaskNoteWidget: Widget {
  private var configuration: some WidgetConfiguration {
    StaticConfiguration(kind: "TaskNoteWidget", provider: TaskNoteProvider()) {entry in
      TaskNoteView(entry: entry).widgetURL(URL(string: "peacee1task:///"))
    }.configurationDisplayName("Tờ note").description("Những việc cần làm trên một tờ ghi chú.")
      .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
  var body: some WidgetConfiguration {configuration}
}


