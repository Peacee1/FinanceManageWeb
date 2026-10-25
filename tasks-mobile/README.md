# Peacee1 Task

Separate Expo iOS app (`com.peacee1.task`) wrapping the existing Tasks web application at https://tasks.peacee1.io.vn/. Login and registration use native forms matching Peacee1 Money, with Task branding. They use the existing native authentication policy (no browser CAPTCHA); backend passwords and rate limits still apply. Refresh credentials are stored in Expo SecureStore under a Task-specific key. A same-origin authenticated POST establishes an HttpOnly web session inside the WebView; tokens are never placed in URLs or localStorage. Account settings remain on the trusted Peacee1 HTTPS domain. External links open in the system browser. No finance app configuration is changed.

This first internal preview requires a network connection. It reuses the live website rather than reimplementing its task, team, habit and chat screens in React Native.

Run `npm install`, `npm run typecheck`, `npm run lint`, then `npx eas-cli@latest build --platform ios --profile preview`. Internal iOS installs require the device UDID in the provisioning profile.
