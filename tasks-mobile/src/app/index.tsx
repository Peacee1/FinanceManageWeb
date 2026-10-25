import {useEffect, useMemo, useRef, useState} from 'react';
import * as SecureStore from 'expo-secure-store';
import {StatusBar} from 'expo-status-bar';
import {ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {isInternalUrl, tasksUrl} from '../navigation';
import AuthScreen from '../AuthScreen';
import {apiUrl} from '../auth';
import {createNativeSessionClient} from '../nativeSession';
import type {Session} from '../types';
import {parseFocusMessage, parseThemeMessage, viewportScript} from '../webview';
import {focusOrientation} from '../orientation.native';
import {updateTaskNote} from '../TaskNoteWidget';
import {emptyNote, noteSnapshot} from '../noteSnapshot';

export default function TaskApp() {
  useEffect(() => {void focusOrientation.setFocus(false).catch(console.warn);}, []);
  const sessions = useMemo(() => createNativeSessionClient(apiUrl, SecureStore), []);
  const [session, setSession] = useState<Session | null>(null);
  const [boot, setBoot] = useState(true), [bootError, setBootError] = useState('');
  useEffect(() => {if (!boot && !session) updateTaskNote(emptyNote);}, [boot, session]);
  const restore = async () => {
    setBoot(true); setBootError('');
    try {
      const saved = await sessions.load();
      if (saved) {
        const next = saved.refreshToken ? await sessions.refresh() : await sessions.upgrade(saved);
        if (next) setSession(next); else await sessions.clear();
      }
    } catch {setBootError('Không khôi phục được phiên. Kiểm tra mạng rồi thử lại.');}
    finally {setBoot(false);}
  };
  // SecureStore restoration is an external asynchronous session operation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const logout = async () => {updateTaskNote(emptyNote); await sessions.logout(); setSession(null);};
  if (boot || bootError) return <SafeAreaView style={[styles.page, {justifyContent: 'center', alignItems: 'center', gap: 18, padding: 24}]}>
    {boot ? <ActivityIndicator color="#191918"/> : <><Text>{bootError}</Text><Pressable onPress={() => void restore()} style={styles.retry}><Text style={{color: '#FFFFFF'}}>Thử lại</Text></Pressable></>}
  </SafeAreaView>;
  if (!session) return <AuthScreen onLogin={async next => {await sessions.save(next); setSession(next);}}/>;
  return <TasksScreen key={session.token} session={session} onLogout={logout}/>;
}

function TasksScreen({session, onLogout}: {session: Session; onLogout: () => Promise<void>}) {
  const insets = useSafeAreaInsets();
  const browser = useRef<WebView>(null);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [url, setUrl] = useState(tasksUrl);
  const [bridging, setBridging] = useState(true);
  const [theme, setTheme] = useState({background: '#F1F0EC', dark: false});
  const [isFocus, setIsFocus] = useState(false);
  const [rotationError, setRotationError] = useState(false);
  const [widgetRevision, setWidgetRevision] = useState(0);
  useEffect(() => {
    let active = true, pending = false;
    let controller: AbortController | null = null;
    const sync = async () => {
      if (pending || !active) return;
      pending = true; controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 15000);
      try {
        const response = await fetch(`${apiUrl}/tasks/items`, {headers: {Authorization: `Bearer ${session.token}`}, signal: controller.signal});
        if (!active) return;
        if (response.status === 401) {updateTaskNote(emptyNote); return;}
        if (!response.ok) return;
        const items: unknown = await response.json();
        if (active) updateTaskNote(noteSnapshot(items));
      } catch {/* Keep the last snapshot during a temporary network outage. */}
      finally {clearTimeout(timeout); pending = false;}
    };
    void sync();
    const timer = setInterval(() => {if (AppState.currentState === 'active') void sync();}, 60000);
    const listener = AppState.addEventListener('change', state => {if (state === 'active') void sync();});
    return () => {active = false; controller?.abort(); clearInterval(timer); listener.remove();};
  }, [session.token, widgetRevision]);
  useEffect(() => {
    void focusOrientation.setFocus(isFocus).then(() => setRotationError(false)).catch(() => setRotationError(true));
  }, [isFocus]);
  useEffect(() => () => {void focusOrientation.setFocus(false).catch(console.warn);}, []);
  const source = useMemo(() => ({uri: `${apiUrl}/auth/web-session`, method: 'POST', body: '{}', headers: {
    Authorization: `Bearer ${session.token}`, Origin: new URL(tasksUrl).origin, 'Content-Type': 'application/json',
  }}), [session.token]);
  const retry = () => {setFailed(false); browser.current?.reload();};

  return <View style={[styles.page, {backgroundColor: theme.background}]}>
    <StatusBar style={theme.dark ? 'light' : 'dark'}/>
    {rotationError && <Pressable style={[styles.button, {paddingTop: insets.top + 8}]} onPress={() => {void focusOrientation.setFocus(isFocus).then(() => setRotationError(false)).catch(() => setRotationError(true));}}><Text>Chưa đổi được hướng màn hình. Nhấn để thử lại.</Text></Pressable>}
    {url !== tasksUrl && url !== `${apiUrl}/auth/web-session` && <View style={[styles.toolbar, {paddingTop: insets.top}]}>
      {canGoBack && <Pressable accessibilityRole="button" onPress={() => browser.current?.goBack()} style={styles.button}><Text>← Quay lại</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={() => {setFailed(false); browser.current?.injectJavaScript(`window.location.href=${JSON.stringify(tasksUrl)};true;`);}} style={styles.button}><Text>Về công việc</Text></Pressable>
    </View>}
    <WebView ref={browser} source={source} style={[styles.browser, {backgroundColor: theme.background}]}
      automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never"
      contentInset={{top: 0, bottom: 0, left: 0, right: 0}}
      injectedJavaScriptBeforeContentLoaded={viewportScript}
      setBuiltInZoomControls={false} setDisplayZoomControls={false}
      bounces={false}
      onMessage={event => {
        if (!event.nativeEvent.url.startsWith(tasksUrl)) return;
        const next = parseThemeMessage(event.nativeEvent.data);
        if (next) setTheme(next);
        const focus = parseFocusMessage(event.nativeEvent.data);
        if (focus !== null) setIsFocus(focus);
        try {if (JSON.parse(event.nativeEvent.data).type === 'task-data-changed') setWidgetRevision(value => value + 1);} catch {/* Non-JSON bridge messages are ignored. */}
      }}
      sharedCookiesEnabled thirdPartyCookiesEnabled startInLoadingState
      allowsBackForwardNavigationGestures setSupportMultipleWindows={false}
      originWhitelist={['https://*']} mixedContentMode="never"
      onNavigationStateChange={state => {setCanGoBack(state.canGoBack); setUrl(state.url); if (!state.url.startsWith(tasksUrl)) setIsFocus(false);}}
      onShouldStartLoadWithRequest={request => {
        if (isInternalUrl(request.url) && ['/login', '/register'].includes(new URL(request.url).pathname)) {
          void onLogout().catch(() => setFailed(true));
          return false;
        }
        if (isInternalUrl(request.url) || request.url === 'about:blank') return true;
        if (/^(https:|mailto:|tel:)/.test(request.url)) {
          void Linking.openURL(request.url).catch(() => undefined);
        }
        return false;
      }}
      onError={() => setFailed(true)}
      onHttpError={event => {if (event.nativeEvent.statusCode >= 400) {setBridging(false); setFailed(true);}}}
      onLoadEnd={event => {
        if (event.nativeEvent.url === `${apiUrl}/auth/web-session`) {
          browser.current?.injectJavaScript(`window.location.replace(${JSON.stringify(tasksUrl)});true;`);
        } else if (isInternalUrl(event.nativeEvent.url)) setBridging(false);
      }}
      onContentProcessDidTerminate={retry}
      renderLoading={() => <View style={styles.overlay}><ActivityIndicator size="large" color="#191918"/><Text>Đang mở Peacee1 Task…</Text></View>}
    />
    {bridging && !failed && <View style={styles.overlay}><ActivityIndicator color="#191918"/><Text>Đang mở công việc của bạn…</Text></View>}
    {failed && <View style={styles.overlay}><Text style={styles.title}>Chưa kết nối được Peacee1 Task</Text><Text>Kiểm tra kết nối mạng rồi thử lại.</Text><Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={{color: '#FFFFFF'}}>Thử lại</Text></Pressable></View>}
  </View>;
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#F1F0EC'},
  browser: {flex: 1, backgroundColor: '#F1F0EC'},
  toolbar: {flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#E2E1DC'},
  button: {padding: 14, minHeight: 48},
  overlay: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#F1F0EC', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24},
  title: {fontSize: 20, fontWeight: '700', color: '#191918', textAlign: 'center'},
  retry: {backgroundColor: '#191918', paddingVertical: 15, paddingHorizontal: 28, borderRadius: 14},
});
