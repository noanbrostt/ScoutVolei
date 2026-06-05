import { View, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, Redirect } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '../src/store/authStore';
import { useFin } from '../src/theme';
import { FieldLabel, FieldPill, PillButton, cardShadow } from '../src/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const fin = useFin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, user } = useAuthStore();

  if (user) {
    return <Redirect href="/(app)/history" />;
  }

  const handleLogin = () => {
    const success = login(username, password);
    if (success) {
      router.replace('/(app)/history');
    } else {
      Alert.alert('Erro', 'Usuário ou senha incorretos.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: fin.bg }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        {/* Logo + title */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Image
            source={require('../assets/icon.jpg')}
            style={{ width: 88, height: 88, borderRadius: 24, marginBottom: 18, ...(fin.shadow === 'transparent' ? {} : { shadowColor: '#14213B', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 }) }}
            resizeMode="cover"
          />
          <Text style={{ fontWeight: '800', fontSize: 28, color: fin.ink, letterSpacing: -0.5 }}>Blues Voleibol</Text>

        </View>

        {/* Form card */}
        <View style={{ backgroundColor: fin.surface, borderRadius: 18, padding: 20, ...cardShadow(fin) }}>
          <View style={{ marginBottom: 16 }}>
            <FieldLabel fin={fin}>Usuário</FieldLabel>
            <FieldPill fin={fin} value={username} onChangeText={setUsername} placeholder="Seu usuário" autoCapitalize="none" />
          </View>
          <View style={{ marginBottom: 20 }}>
            <FieldLabel fin={fin}>Senha</FieldLabel>
            <FieldPill fin={fin} value={password} onChangeText={setPassword} placeholder="Sua senha" secureTextEntry autoCapitalize="none" />
          </View>
          <PillButton label="Entrar" icon="login" fin={fin} onPress={handleLogin} disabled={!username.trim() || !password.trim()} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
