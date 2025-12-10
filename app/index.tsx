import { View, Alert } from 'react-native';
import { Button, TextInput, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../src/store/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, user } = useAuthStore(); // Get user from store

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace('/(app)/history');
    }
  }, [user]);

  const handleLogin = () => {
    const success = login(username, password);
    if (success) {
      router.replace('/(app)/history');
    } else {
      Alert.alert("Erro", "Usuário ou senha incorretos.");
    }
  };

  return (
    <View className="flex-1 justify-center items-center p-4" style={{ backgroundColor: theme.colors.background }}>
      <Text variant="headlineLarge" style={{ color: theme.colors.primary, marginBottom: 32, fontWeight: 'bold' }}>
        Scout Vôlei
      </Text>
      
      <TextInput
        label="Usuário"
        value={username}
        onChangeText={setUsername}
        style={{ width: '100%', marginBottom: 16 }}
        mode="outlined"
        autoCapitalize="none"
      />
      
      <TextInput
        label="Senha"
        value={password}
        onChangeText={setPassword}
        style={{ width: '100%', marginBottom: 24 }}
        mode="outlined"
        secureTextEntry
      />

      <Button mode="contained" onPress={handleLogin} style={{ width: '100%', paddingVertical: 4 }}>
        Entrar
      </Button>
    </View>
  );
}
