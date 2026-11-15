import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function ElderlyTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#047857',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: styles.tabLabel
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarLabel: 'Today'
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          title: 'Medicines',
          tabBarLabel: 'Medicines'
        }}
      />
      <Tabs.Screen
        name="emergency"
        options={{
          title: 'Help',
          tabBarLabel: 'Help'
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 72,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 2,
    borderTopColor: '#CBD5E1'
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: 'bold'
  }
});
