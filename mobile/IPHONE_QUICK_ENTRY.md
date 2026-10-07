# iPhone quick entry and widget

Back Tap setup: Profile → App → Advanced settings → Back Tap quick entry.
Create an Apple shortcut with Take Screenshot → Extract Text from Image → URL Encode → Text (peacee1:///bank-record?text= + encoded text variable) → Open URLs.
Assign it in iOS Settings → Accessibility → Touch → Back Tap → Double Tap. Expand the bank notification before running. OCR executes in Apple Shortcuts on the device. Raw notification text is not uploaded; only the confirmed amount/category/note become a transaction. Unknown or ambiguous amounts require manual input.

Widget setup: Profile → App → iPhone widgets. The small widget opens expense entry; medium links to expense entry, QR scan and calendar. No balance or credentials are copied into the widget. Language/accent are updated when the app opens or preferences change.

Required signing identifiers:
- Main app: com.peacee1.mobile
- Widget extension: com.peacee1.mobile.widgets
- App Group: group.com.peacee1.mobile

Expo config plugin generates the widget extension; do not edit generated ios/ files. Both targets need Apple provisioning profiles with the App Group entitlement. EAS noninteractive build currently fails because iOS signing credentials are incomplete. Configure through interactive EAS credentials/build on the user's machine; never commit Apple credentials. Expo Go does not include expo-widgets. A signed development/TestFlight build is required to verify Back Tap screenshot permissions, OCR and widget taps on a physical iPhone.
