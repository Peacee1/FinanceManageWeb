import {useRef, useState} from 'react';
import {ActivityIndicator, Linking, Pressable, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {isInternalUrl, tasksUrl} from '../navigation';

export default function TasksScreen() {
  const browser = useRef<WebView>(null);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [url, setUrl] = useState(tasksUrl);
  const retry = () => {setFailed(false); browser.current?.reload();};

  return <SafeAreaView style={styles.page} edges={['top', 'left', 'right', 'bottom']}>
    {url !== tasksUrl && <View style={styles.toolbar}>
      {canGoBack && <Pressable accessibilityRole="button" onPress={() => browser.current?.goBack()} style={styles.button}><Text>← Quay lại</Text></Pressable>}
      <Pressable accessibilityRole="button" onPress={() => {setFailed(false); browser.current?.injectJavaScript(`window.location.href=${JSON.stringify(tasksUrl)};true;`);}} style={styles.button}><Text>Về công việc</Text></Pressable>
    </View>}
    <WebView ref={browser} source={{uri: tasksUrl}} style={styles.browser}
      sharedCookiesEnabled thirdPartyCookiesEnabled startInLoadingState
      allowsBackForwardNavigationGestures setSupportMultipleWindows={false}
      originWhitelist={['https://*']} mixedContentMode="never"
      onNavigationStateChange={state => {setCanGoBack(state.canGoBack); setUrl(state.url);}}
      onShouldStartLoadWithRequest={request => {
        if (isInternalUrl(request.url) || request.url === 'about:blank') return true;
        if (/^(https:|mailto:|tel:)/.test(request.url)) {
          void Linking.openURL(request.url).catch(() => undefined);
        }
        return false;
      }}
      onError={() => setFailed(true)}
      onHttpError={event => {if (event.nativeEvent.statusCode >= 500) setFailed(true);}}
      onContentProcessDidTerminate={retry}
      renderLoading={() => <View style={styles.overlay}><ActivityIndicator size="large" color="#7C3AED"/><Text>Đang mở Peacee1 Task…</Text></View>}
    />
    {failed && <View style={styles.overlay}><Text style={styles.title}>Chưa kết nối được Peacee1 Task</Text><Text>Kiểm tra kết nối mạng rồi thử lại.</Text><Pressable accessibilityRole="button" onPress={retry} style={styles.retry}><Text style={{color: '#FFFFFF'}}>Thử lại</Text></Pressable></View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#FAF9FF'},
  browser: {flex: 1, backgroundColor: '#FAF9FF'},
  toolbar: {flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#E9E5F3'},
  button: {padding: 14, minHeight: 48},
  overlay: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#FAF9FF', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24},
  title: {fontSize: 20, fontWeight: '700', color: '#181525', textAlign: 'center'},
  retry: {backgroundColor: '#7C3AED', paddingVertical: 15, paddingHorizontal: 28, borderRadius: 14},
});
