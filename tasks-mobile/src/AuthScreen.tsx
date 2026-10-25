import {useRef, useState} from 'react';
import {Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {authenticate} from './auth';
import type {Session} from './types';
import {Stack} from 'expo-router';

export default function AuthScreen({onLogin}: {onLogin: (session: Session) => Promise<void>}) {
  const [register, setRegister] = useState(false), [name, setName] = useState('');
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const pending = useRef(false);
  const submit = async () => {
    if (pending.current) return;
    setError(''); setNotice('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {setError('Nhập email và mật khẩu để tiếp tục.'); return;}
    if (register && (!name.trim() || password !== confirm)) {setError(!name.trim() ? 'Nhập họ và tên.' : 'Mật khẩu xác nhận chưa khớp.'); return;}
    if (register && (password.length < 8 || !/(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(password))) {setError('Mật khẩu cần từ 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.'); return;}
    pending.current = true; setBusy(true);
    try {
      const session = await authenticate(register, {email, password, ...(register ? {name: name.trim()} : {})});
      if (session) await onLogin(session);
      else {setRegister(false); setNotice('Tạo tài khoản thành công. Đăng nhập để bắt đầu.');}
      setPassword(''); setConfirm('');
    } catch (failure) {setError(failure instanceof Error ? failure.message : 'Không kết nối được máy chủ.');}
    finally {pending.current = false; setBusy(false);}
  };
  return <SafeAreaView style={styles.page}><Stack.Screen options={{orientation: 'portrait'}}/><KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <View style={styles.brand}><Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain"/><Text style={styles.brandName}>Peacee1 Task</Text></View>
      <View style={styles.card}>
        <View style={styles.heading}><Text style={styles.title}>{register ? 'Tạo tài khoản' : 'Chào bạn quay lại'}</Text><Text style={styles.muted}>{register ? 'Sắp xếp mỗi ngày theo cách của bạn' : 'Đăng nhập để quản lý công việc'}</Text></View>
        {register && <View style={styles.field}><Text style={styles.label}>Họ và tên</Text><TextInput accessibilityLabel="Họ và tên" value={name} onChangeText={setName} style={styles.input} maxLength={100} autoComplete="name"/></View>}
        <View style={styles.field}><Text style={styles.label}>Email</Text><TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoComplete="email" autoCapitalize="none" autoCorrect={false} maxLength={255}/></View>
        <View style={styles.field}><Text style={styles.label}>Mật khẩu</Text><View style={styles.password}><TextInput accessibilityLabel="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} autoComplete={register ? 'new-password' : 'current-password'} style={[styles.input, styles.passwordInput]}/><Pressable accessibilityRole="button" accessibilityLabel={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onPress={() => setShow(!show)} style={styles.show}><Text style={styles.link}>{show ? 'Ẩn' : 'Hiện'}</Text></Pressable></View></View>
        {register && <View style={styles.field}><Text style={styles.label}>Nhập lại mật khẩu</Text><TextInput accessibilityLabel="Nhập lại mật khẩu" value={confirm} onChangeText={setConfirm} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} style={styles.input}/></View>}
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {!!notice && <Text style={styles.success}>{notice}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} accessibilityState={{disabled: busy}} onPress={() => void submit()} style={[styles.submit, busy && {opacity: .5}]}><Text style={styles.submitText}>{busy ? 'Đang xử lý…' : register ? 'Đăng ký ngay' : 'Tiếp tục'}</Text></Pressable>
        {!register && <Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://peacee1.io.vn/recover.html')} style={styles.recover}><Text style={styles.link}>Quên mật khẩu?</Text></Pressable>}
        <Text style={styles.caption}>Công việc cá nhân và nhóm, cùng bạn hoàn thành những mục tiêu mỗi ngày.</Text>
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => {setRegister(!register); setError(''); setNotice(''); setPassword(''); setConfirm('');}} style={styles.switch}><Text style={styles.muted}>{register ? 'Đã có tài khoản? ' : 'Bạn là người mới? '}<Text style={styles.link}>{register ? 'Đăng nhập' : 'Tạo tài khoản'}</Text></Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#F1F0EC'},
  content: {flexGrow: 1, justifyContent: 'center', padding: 24, gap: 28, maxWidth: 460, width: '100%', alignSelf: 'center'},
  brand: {alignItems: 'center', gap: 14}, logo: {width: 100, height: 88}, brandName: {fontSize: 22, fontWeight: '800', color: '#191918'},
  card: {padding: 28, borderRadius: 32, gap: 18, backgroundColor: '#FFFFFF', boxShadow: '0px 12px 36px rgba(25,25,24,.04)'},
  heading: {alignItems: 'center', gap: 6, marginBottom: 8}, title: {fontSize: 24, fontWeight: '700', color: '#191918'}, muted: {color: '#6B6B65', fontSize: 14, lineHeight: 21, textAlign: 'center'},
  field: {gap: 7}, label: {fontSize: 14, color: '#6B6B65'}, input: {backgroundColor: '#F1F0EC', borderWidth: 1, borderColor: '#E2E1DC', borderRadius: 14, padding: 15, fontSize: 16, minHeight: 50, color: '#191918'},
  password: {flexDirection: 'row', borderWidth: 1, borderColor: '#E2E1DC', borderRadius: 14, overflow: 'hidden', backgroundColor: '#F1F0EC'}, passwordInput: {flex: 1, minWidth: 0, borderWidth: 0}, show: {padding: 14, justifyContent: 'center', minWidth: 54},
  link: {color: '#191918', fontWeight: '700', fontSize: 13}, submit: {backgroundColor: '#191918', borderRadius: 14, padding: 15, minHeight: 50, alignItems: 'center'}, submitText: {fontWeight: '700', fontSize: 14, color: '#FFFFFF'},
  caption: {color: '#6B6B65', fontSize: 11, lineHeight: 18, textAlign: 'center'}, error: {color: '#BE123C', fontSize: 13, lineHeight: 20}, success: {color: '#047857', fontSize: 13}, switch: {padding: 10, minHeight: 44}, recover: {alignItems: 'center', padding: 8, minHeight: 44},
});
