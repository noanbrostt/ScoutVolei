import { View } from 'react-native';
import { Button, TextInput, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    // TODO: Implement Firebase Auth
    // For now, just navigate to history (Partidas)
    router.replace('/(app)/history');
  };

  return (
    <View className="flex-1 justify-center items-center p-4" style={{ backgroundColor: theme.colors.background }}>
      <Text variant="headlineLarge" style={{ color: theme.colors.primary, marginBottom: 32, fontWeight: 'bold' }}>
        MeuAppVolei
      </Text>
      
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={{ width: '100%', marginBottom: 16 }}
        mode="outlined"
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
