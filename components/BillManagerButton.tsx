// Add this to your Home screen component
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { HomeScreenNavigationProp } from '../types/navigation';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export function BillManagerButton() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <TouchableOpacity
      style={styles.billButtonContainer}
      onPress={() => navigation.navigate('BillManager')}
    >
      <LinearGradient
        colors={['#80C545', '#0050A0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.billButton}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="receipt" size={24} color="#fff" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Bill Manager</Text>
          <Text style={styles.subtitle}>Track and manage your bills</Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  billButtonContainer: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0050A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  billButton: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#E0FFDA',
  },
});