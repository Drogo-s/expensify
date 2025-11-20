import * as React from "react";
import { SQLiteProvider } from "expo-sqlite";
import { ActivityIndicator, Platform, Text, View } from "react-native";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import Home from "./screens/Home";
import Payment from "./screens/sheets/Payment";
import CurrencyConverterButton from "./components/CurrencyPicker";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link } from "@react-navigation/native";
import LoginSystem from "./screens/sheets/LoginScreen";
import ExpenseIncomeReminder from "./screens/ExpenseIncomeReminder"; // Add this import

const Stack = createNativeStackNavigator();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  // Check if user is already logged in
  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const authStatus = await AsyncStorage.getItem('isAuthenticated');
      if (authStatus === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async () => {
    try {
      await AsyncStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error saving auth status:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('isAuthenticated');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <LoginSystem onLoginSuccess={handleLoginSuccess} />
      </NavigationContainer>
    );
  }

  // Show main app if authenticated
  return (
    <NavigationContainer>
      <React.Suspense
        fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
            <Text>Loading Database...</Text>
          </View>
        }
      >
        <SQLiteProvider
          databaseName="mySQLiteDB.db"
          useSuspense
          assetSource={{
            assetId: require("./assets/mySQLiteDB.db"),
          }}
        >
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={Home}
              options={{
                headerTitle: "EXPENSIFY",
                headerLargeTitle: true,
                headerTransparent: Platform.OS === "ios" ? true : false,
                headerBlurEffect: "light",
                headerRight: () => (
                  <Text 
                    onPress={handleLogout}
                    style={{ 
                      color: '#2563eb', 
                      fontSize: 16,
                      fontWeight: '600',
                      paddingRight: 10
                    }}
                  >
                    Logout
                  </Text>
                ),
              }}
            />
            
            <Stack.Screen
              name="Payment"
              component={Payment}
              options={{
                presentation: "transparentModal",
                animation: "slide_from_bottom",
                animationTypeForReplace: "pop",
                headerShown: false,
              }}
            />
            
            <Stack.Screen
              name="CurrencyPicker"
              component={CurrencyConverterButton}
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                headerShown: true,
                headerTitle: "Currency Settings",
                headerLargeTitle: false,
              }}
            />

            {/* Add this new screen */}
            <Stack.Screen
              name="Reminders"
              component={ExpenseIncomeReminder}
              options={{
                headerTitle: "Financial Reminders",
                headerLargeTitle: true,
                headerTransparent: Platform.OS === "ios" ? true : false,
                headerBlurEffect: "light",
              }}
            />
          </Stack.Navigator>
        </SQLiteProvider>
      </React.Suspense>
    </NavigationContainer>
  );
}