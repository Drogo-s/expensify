import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Simulated Database (In-memory for demo)
class UserDatabase {
  private users: Map<string, { username: string; pin: string; isLoggedIn: boolean }>;

  constructor() {
    this.users = new Map();
    // Add demo user
    this.users.set('admin', { username: 'admin', pin: '1234', isLoggedIn: false });
  }

  createUser(username: string, pin: string): boolean {
    if (this.users.has(username)) {
      return false;
    }
    this.users.set(username, { username, pin, isLoggedIn: false });
    return true;
  }

  authenticateUser(username: string, pin: string): boolean {
    const user = this.users.get(username);
    if (user && user.pin === pin) {
      user.isLoggedIn = true;
      return true;
    }
    return false;
  }

  logoutUser(username: string): void {
    const user = this.users.get(username);
    if (user) {
      user.isLoggedIn = false;
    }
  }

  getUserPin(username: string): string | null {
    const user = this.users.get(username);
    return user ? user.pin : null;
  }
}

const db = new UserDatabase();

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginSystem({ onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPin, setIsForgotPin] = useState(false);
  const [recoveryUsername, setRecoveryUsername] = useState('');

  const handlePinChange = (value: string) => {
    if (value.length <= 4 && /^\d*$/.test(value)) {
      setPin(value);
    }
  };

  const handleLogin = () => {
    setError('');

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    if (db.authenticateUser(username, pin)) {
      onLoginSuccess();
      setUsername('');
      setPin('');
    } else {
      setError('Invalid username or PIN');
    }
  };

  const handleRegister = () => {
    setError('');

    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    if (db.createUser(username, pin)) {
      Alert.alert('Success', 'Account created successfully! You can now login.');
      setIsRegistering(false);
      setUsername('');
      setPin('');
    } else {
      setError('Username already exists');
    }
  };

  const handleForgotPin = () => {
    setError('');

    if (!recoveryUsername.trim()) {
      setError('Please enter your username');
      return;
    }

    const userPin = db.getUserPin(recoveryUsername);
    
    if (userPin) {
      Alert.alert(
        'PIN Recovery',
        `Your PIN is: ${userPin}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setIsForgotPin(false);
              setRecoveryUsername('');
              setError('');
            },
          },
        ]
      );
    } else {
      setError('Username not found. Please check and try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isForgotPin ? 'Recover PIN' : isRegistering ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={styles.subtitle}>
            {isForgotPin
              ? 'Enter your username to recover your PIN'
              : isRegistering
              ? 'Register with username and 4-digit PIN'
              : 'Login with your credentials'}
          </Text>
        </View>

        {isForgotPin ? (
          // Forgot PIN Form
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={recoveryUsername}
                onChangeText={setRecoveryUsername}
                placeholder="Enter your username"
                autoCapitalize="none"
              />
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.buttonContainer}
              onPress={handleForgotPin}
            >
              <LinearGradient
                colors={['#90EE90', '#0047AB']}
                style={styles.button}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>Recover PIN</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsForgotPin(false);
                setRecoveryUsername('');
                setError('');
              }}
              style={styles.backButton}
            >
              <Text style={styles.switchText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Login/Register Form
          <>
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter username"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>4-Digit PIN</Text>
                <TextInput
                  style={[styles.input, styles.pinInput]}
                  value={pin}
                  onChangeText={handlePinChange}
                  placeholder="••••"
                  maxLength={4}
                  keyboardType="numeric"
                  secureTextEntry
                />
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={isRegistering ? handleRegister : handleLogin}
              >
                <LinearGradient
                  colors={['#90EE90', '#0047AB']}
                  style={styles.button}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>
                    {isRegistering ? 'Create Account' : 'Login'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {!isRegistering && (
              <TouchableOpacity
                onPress={() => {
                  setIsForgotPin(true);
                  setError('');
                }}
                style={styles.forgotPinButton}
              >
                <Text style={styles.forgotPinText}>Forgot PIN?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setUsername('');
                setPin('');
              }}
              style={styles.switchButton}
            >
              <Text style={styles.switchText}>
                {isRegistering ? 'Already have an account? Login' : "Don't have an account? Register"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.demoContainer}>
          <Text style={styles.demoText}>
          
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0066CC',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  pinInput: {
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
  },
  buttonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  switchText: {
    color: '#007FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotPinButton: {
    alignItems: 'center',
    marginBottom: 16,
  },
  forgotPinText: {
    color: '#6b7280',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
  },
  demoContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
  },
  demoText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  demoBold: {
    fontWeight: '600',
    color: '#1f2937',
  },
});