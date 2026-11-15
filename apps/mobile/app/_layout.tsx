import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#047857" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(elderly)" />
        <Stack.Screen name="(family)" />
      </Stack>
    </SafeAreaProvider>
  );
}
