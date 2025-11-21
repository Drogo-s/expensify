import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface Reminder {
  id: string;
  type: 'expense' | 'income';
  title: string;
  amount: number;
  currency: string;
  dueDate: string;
  category: string;
  recurring: boolean;
  notified: boolean;
  notificationId?: string;
  paid?: boolean;
  paidDate?: string;
  transactionId?: number;
}

interface NotificationTime {
  hour: number;
  minute: number;
}

interface Transaction {
  id: number;
  category_id: number;
  amount: number;
  date: number;
  description: string;
  type: "Expense" | "Income";
}

interface ExpenseIncomeReminderProps {
  onReminderPaid?: (reminder: Reminder) => void;
  insertTransaction?: (transaction: Transaction) => Promise<void>;
  categories?: Array<{ id: number; name: string; type: string }>;
  currentCurrency?: string;
  exchangeRate?: number;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

const STORAGE_KEY = '@reminders_data';
const NOTIFICATION_TIME_KEY = '@notification_time';

const EXPENSE_CATEGORIES = [
  'Utilities',
  'Electronics',
  'Dining Out',
  'Breakfast Supplies',
  'Household Items',
  'Christmas Gifts',
  'New Year Party Supplies',
  'Thanksgiving Groceries'
];

const INCOME_CATEGORIES = [
  'Bonus',
  'Consulting Work',
  'Part-time Job',
  'Online sales',
  'Freelance Writing',
  'End of Year Bonus',
  'Thanksgiving Freelance'
];

// Exchange rates relative to KES (Kenyan Shilling as base)
const EXCHANGE_RATES: { [key: string]: number } = {
  'KES': 1,
  'USD': 0.0077,
  'EUR': 0.0071,
  'GBP': 0.0061,
  'JPY': 1.19,
  'CNY': 0.056,
  'INR': 0.65,
  'CAD': 0.011,
  'AUD': 0.012,
  'CHF': 0.0069,
  'BRL': 0.046,
  'ZAR': 0.14,
  'NGN': 12.2,
  'AED': 0.028,
  'SAR': 0.029,
  'SGD': 0.010,
};

export default function ExpenseIncomeReminder({
  onReminderPaid,
  insertTransaction,
  categories = [],
  currentCurrency = 'KES',
  exchangeRate = 1,
}: ExpenseIncomeReminderProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [notificationTime, setNotificationTime] = useState<NotificationTime>({ hour: 9, minute: 0 });
  const [tempNotificationTime, setTempNotificationTime] = useState<NotificationTime>({ hour: 9, minute: 0 });
  const [formData, setFormData] = useState({
    type: 'expense' as 'expense' | 'income',
    title: '',
    amount: '',
    currency: 'KES',
    dueDate: '',
    category: '',
    recurring: false,
  });

  useEffect(() => {
    requestPermissions();
    loadNotificationTime();
    loadReminders();
    
    const interval = setInterval(() => {
      checkDueReminders();
    }, 3600000);

    return () => {
      clearInterval(interval);
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (reminders.length > 0) {
      saveReminders();
      checkDueReminders();
    }
  }, [reminders]);

  const requestPermissions = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please enable notifications to receive reminders about your expenses and income.',
          [{ text: 'OK' }]
        );
        setNotificationPermission(false);
        return;
      }
      
      setNotificationPermission(true);
      
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Financial Reminders',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0050A0',
          sound: 'default',
        });
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  };

  const loadNotificationTime = async () => {
    try {
      const savedTime = await AsyncStorage.getItem(NOTIFICATION_TIME_KEY);
      if (savedTime) {
        const time = JSON.parse(savedTime);
        setNotificationTime(time);
        setTempNotificationTime(time);
      }
    } catch (error) {
      console.error('Error loading notification time:', error);
    }
  };

  const saveNotificationTime = async (time: NotificationTime) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_TIME_KEY, JSON.stringify(time));
      setNotificationTime(time);
      
      await rescheduleAllNotifications(time);
      
      Alert.alert(
        'Settings Saved',
        `Notifications will now be sent at ${time.hour.toString().padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving notification time:', error);
      Alert.alert('Error', 'Failed to save notification time');
    }
  };

  const rescheduleAllNotifications = async (time: NotificationTime) => {
    for (const reminder of reminders) {
      if (reminder.notificationId && !reminder.paid) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }
    }

    const updatedReminders = [...reminders];
    for (let i = 0; i < updatedReminders.length; i++) {
      const reminder = updatedReminders[i];
      if (!reminder.paid) {
        const daysUntil = getDaysUntilDue(reminder.dueDate);
        
        if (daysUntil >= 0 && daysUntil <= 3) {
          const notificationId = await scheduleNotification(reminder, daysUntil, time);
          updatedReminders[i] = { ...reminder, notificationId: notificationId || undefined, notified: false };
        }
      }
    }
    
    setReminders(updatedReminders);
  };

  const playNotificationSound = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('../assets/notification.mp3'),
        { shouldPlay: true, volume: 1.0 }
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.log('Error playing sound:', error);
    }
  };

  const scheduleNotification = async (
    reminder: Reminder, 
    daysUntil: number, 
    time: NotificationTime = notificationTime
  ) => {
    if (!notificationPermission || reminder.paid) return null;

    try {
      const symbol = getCurrencySymbol(reminder.currency);
      const title = daysUntil === 0 
        ? `${reminder.type === 'expense' ? '💸 Expense' : '💰 Income'} Due Today!`
        : `${reminder.type === 'expense' ? '💸 Expense' : '💰 Income'} Reminder`;
      
      const body = daysUntil === 0
        ? `${reminder.title} - ${symbol}${reminder.amount.toFixed(2)} ${reminder.currency} is due today!`
        : `${reminder.title} - ${symbol}${reminder.amount.toFixed(2)} ${reminder.currency} is due in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`;

      const notificationDate = new Date(reminder.dueDate);
      notificationDate.setDate(notificationDate.getDate() - daysUntil);
      notificationDate.setHours(time.hour, time.minute, 0, 0);

      const now = new Date();
      if (notificationDate.getTime() <= now.getTime()) {
        console.log('Notification time already passed, skipping:', notificationDate);
        return null;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
          data: { reminderId: reminder.id, type: reminder.type },
        },
        trigger: {
          date: notificationDate,
          repeats: false,
        },
      });

      console.log(`Notification scheduled for ${notificationDate.toLocaleString()}`);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  };

  const loadReminders = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setReminders(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const saveReminders = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const checkDueReminders = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newNotifications: string[] = [];
    const updatedReminders = [...reminders];

    for (let i = 0; i < updatedReminders.length; i++) {
      const reminder = updatedReminders[i];
      if (reminder.paid) continue;

      const dueDate = new Date(reminder.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil(
        (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDue <= 3 && daysUntilDue >= 0 && !reminder.notified) {
        const symbol = getCurrencySymbol(reminder.currency);
        const message =
          daysUntilDue === 0
            ? `${reminder.type === 'expense' ? '💸' : '💰'} ${
                reminder.title
              } is due TODAY! ${symbol}${reminder.amount.toFixed(2)} ${
                reminder.currency
              }`
            : `${reminder.type === 'expense' ? '💸' : '💰'} ${
                reminder.title
              } is due in ${daysUntilDue} day${
                daysUntilDue > 1 ? 's' : ''
              }! ${symbol}${reminder.amount.toFixed(2)} ${reminder.currency}`;

        newNotifications.push(message);

        const notificationId = await scheduleNotification(reminder, daysUntilDue);
        
        if (daysUntilDue <= 1) {
          await playNotificationSound();
        }

        updatedReminders[i] = { 
          ...reminder, 
          notified: true,
          notificationId: notificationId || undefined
        };
      }
    }

    if (newNotifications.length > 0) {
      setNotifications((prev) => [...newNotifications, ...prev].slice(0, 5));
      setReminders(updatedReminders);
    }
  };

  const addReminder = async () => {
    if (
      !formData.title ||
      !formData.amount ||
      !formData.dueDate ||
      !formData.category
    ) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const newReminder: Reminder = {
      id: Date.now().toString(),
      type: formData.type,
      title: formData.title,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      dueDate: formData.dueDate,
      category: formData.category,
      recurring: formData.recurring,
      notified: false,
      paid: false,
    };

    const daysUntil = getDaysUntilDue(formData.dueDate);
    if (daysUntil >= 0 && daysUntil <= 3) {
      const notificationId = await scheduleNotification(newReminder, daysUntil);
      newReminder.notificationId = notificationId || undefined;
    }

    setReminders([...reminders, newReminder]);
    setFormData({
      type: 'expense',
      title: '',
      amount: '',
      currency: 'KES',
      dueDate: '',
      category: '',
      recurring: false,
    });
    setShowForm(false);

    Alert.alert(
      'Reminder Added',
      `You will receive notifications at ${notificationTime.hour.toString().padStart(2, '0')}:${notificationTime.minute.toString().padStart(2, '0')} as the due date approaches.`,
      [{ text: 'OK' }]
    );
  };

  const convertToKES = (amount: number, currency: string): number => {
    if (currency === 'KES') return amount;
    const rate = EXCHANGE_RATES[currency] || 1;
    return amount / rate;
  };

  const markAsPaid = async (reminder: Reminder) => {
    console.log('markAsPaid called with:', {
      reminder,
      hasInsertTransaction: !!insertTransaction,
      categoriesLength: categories.length,
    });

    if (!insertTransaction) {
      Alert.alert(
        'Error',
        'Transaction system not available. Please try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (categories.length === 0) {
      Alert.alert(
        'Error',
        'No categories available. Please add categories first.',
        [{ text: 'OK' }]
      );
      return;
    }

    const reminderCategoryNormalized = reminder.category.trim().toLowerCase();
    const reminderType = reminder.type === 'expense' ? 'Expense' : 'Income';
    
    const category = categories.find(
      (cat) => cat.name.trim().toLowerCase() === reminderCategoryNormalized && 
                cat.type === reminderType
    );

    console.log('Category search details:', {
      reminderCategory: reminder.category,
      normalized: reminderCategoryNormalized,
      reminderType: reminderType,
      allCategories: categories.map(c => ({ name: c.name, type: c.type, normalized: c.name.trim().toLowerCase() })),
      foundCategory: category
    });

    if (!category) {
      const availableCategories = categories.filter(c => c.type === reminderType);
      const closeMatch = availableCategories.find(
        cat => cat.name.trim().toLowerCase().includes(reminderCategoryNormalized) ||
               reminderCategoryNormalized.includes(cat.name.trim().toLowerCase())
      );

      if (closeMatch) {
        Alert.alert(
          'Category Match',
          `Category "${reminder.category}" not found exactly, but found "${closeMatch.name}".\n\nUse "${closeMatch.name}" for this transaction?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Use Match',
              onPress: async () => {
                await createTransactionAndFinalize(reminder, closeMatch);
              },
            },
          ]
        );
        return;
      }

      Alert.alert(
        'Category Not Found',
        `The category "${reminder.category}" doesn't exist.\n\nAvailable ${reminder.type} categories: ${
          availableCategories.map(c => c.name).join(', ') || 'None'
        }\n\nPlease create this category in Settings > Categories first, or edit the reminder to use an existing category.`,
        [{ text: 'OK' }]
      );
      return;
    }

    await createTransactionAndFinalize(reminder, category);
  };

  const createTransactionAndFinalize = async (reminder: Reminder, category: { id: number; name: string; type: string }) => {
    try {
      const amountInKES = convertToKES(reminder.amount, reminder.currency);
      
      const transaction: Transaction = {
        id: Date.now(),
        category_id: category.id,
        amount: amountInKES,
        date: Math.floor(Date.now() / 1000),
        description: `${reminder.title} (from reminder - original: ${getCurrencySymbol(reminder.currency)}${reminder.amount.toFixed(2)} ${reminder.currency})`,
        type: reminder.type === 'expense' ? 'Expense' : 'Income',
      };

      console.log('Creating transaction:', transaction);

      await insertTransaction!(transaction);
      
      console.log('Transaction created successfully');
      
      await finalizePayment(reminder, transaction.id);
      
      Alert.alert(
        'Payment Recorded ✅',
        `${reminder.type === 'expense' ? 'Expense' : 'Income'} of ${getCurrencySymbol(reminder.currency)}${reminder.amount.toFixed(2)} ${reminder.currency} (${getCurrencySymbol('KES')}${amountInKES.toFixed(2)} KES) has been recorded and added to your transactions.`,
        [{ text: 'OK' }]
      );

      if (onReminderPaid) {
        onReminderPaid(reminder);
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      Alert.alert(
        'Error', 
        `Failed to record payment: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  };

  const finalizePayment = async (reminder: Reminder, transactionId: number | null) => {
    if (reminder.notificationId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      } catch (error) {
        console.log('Error canceling notification:', error);
      }
    }

    const updatedReminders = reminders.map((r) =>
      r.id === reminder.id
        ? {
            ...r,
            paid: true,
            paidDate: new Date().toISOString(),
            transactionId: transactionId || undefined,
          }
        : r
    );

    setReminders(updatedReminders);
    setShowPaymentModal(false);
    setSelectedReminder(null);
  };

  const deleteReminder = async (id: string) => {
    Alert.alert('Delete Reminder', 'Are you sure you want to delete this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const reminder = reminders.find(r => r.id === id);
          if (reminder?.notificationId) {
            try {
              await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
            } catch (error) {
              console.log('Error canceling notification:', error);
            }
          }
          setReminders(reminders.filter((r) => r.id !== id));
        },
      },
    ]);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const activeReminders = reminders
    .filter((r) => !r.paid && getDaysUntilDue(r.dueDate) >= 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const paidReminders = reminders
    .filter((r) => r.paid)
    .sort((a, b) => new Date(b.paidDate || b.dueDate).getTime() - new Date(a.paidDate || a.dueDate).getTime())
    .slice(0, 5);

  const groupByCurrency = (items: Reminder[]) => {
    return items.reduce((acc, item) => {
      if (!acc[item.currency]) {
        acc[item.currency] = 0;
      }
      acc[item.currency] += item.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const expensesByCurrency = groupByCurrency(
    activeReminders.filter((r) => r.type === 'expense')
  );
  const incomesByCurrency = groupByCurrency(
    activeReminders.filter((r) => r.type === 'income')
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Reminders</Text>
          <TouchableOpacity onPress={() => setShowSettings(true)}>
            <Ionicons name="settings-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {!notificationPermission && (
          <View style={styles.permissionWarning}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <View style={styles.permissionWarningText}>
              <Text style={styles.permissionWarningTitle}>
                Notifications Disabled
              </Text>
              <Text style={styles.permissionWarningSubtitle}>
                Enable notifications in settings to receive reminders
              </Text>
            </View>
          </View>
        )}

        <View style={styles.notificationTimeDisplay}>
          <Ionicons name="time-outline" size={20} color="#0050A0" />
          <Text style={styles.notificationTimeText}>
            Daily notifications at {notificationTime.hour.toString().padStart(2, '0')}:{notificationTime.minute.toString().padStart(2, '0')}
          </Text>
        </View>

        {notifications.length > 0 && (
          <View style={styles.notificationPanel}>
            <View style={styles.notificationHeader}>
              <Ionicons name="notifications" size={24} color="#fb923c" />
              <Text style={styles.notificationTitle}>Active Notifications</Text>
            </View>
            {notifications.map((notif, idx) => (
              <View key={idx} style={styles.notificationItem}>
                <Text style={styles.notificationText}>{notif}</Text>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setNotifications([])}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.incomeCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-up" size={32} color="#34d399" />
              <Text style={styles.statLabel}>Upcoming Income</Text>
            </View>
            {Object.keys(incomesByCurrency).length === 0 ? (
              <Text style={styles.emptyText}>No upcoming income</Text>
            ) : (
              Object.entries(incomesByCurrency).map(([currency, amount]) => (
                <View key={currency} style={styles.statRow}>
                  <Text style={styles.currencyCode}>{currency}</Text>
                  <Text style={styles.statAmount}>
                    {getCurrencySymbol(currency)}
                    {amount.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View style={[styles.statCard, styles.expenseCard]}>
            <View style={styles.statHeader}>
              <Ionicons name="trending-down" size={32} color="#f87171" />
              <Text style={styles.statLabel}>Upcoming Expenses</Text>
            </View>
            {Object.keys(expensesByCurrency).length === 0 ? (
              <Text style={styles.emptyText}>No upcoming expenses</Text>
            ) : (
              Object.entries(expensesByCurrency).map(([currency, amount]) => (
                <View key={currency} style={styles.statRow}>
                  <Text style={styles.currencyCode}>{currency}</Text>
                  <Text style={styles.statAmount}>
                    {getCurrencySymbol(currency)}
                    {amount.toFixed(2)}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.addButtonContainer}
          onPress={() => setShowForm(true)}
        >
          <LinearGradient
            colors={['#80C545', '#0050A0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButton}
          >
            <Ionicons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add New Reminder</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.remindersContainer}>
          <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
          {activeReminders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyMessage}>
                No upcoming reminders. Add one to get started!
              </Text>
            </View>
          ) : (
            activeReminders.map((reminder) => {
              const daysUntil = getDaysUntilDue(reminder.dueDate);
              const isUrgent = daysUntil <= 3;
              const symbol = getCurrencySymbol(reminder.currency);

              return (
                <View
                  key={reminder.id}
                  style={[
                    styles.reminderCard,
                    reminder.type === 'expense'
                      ? styles.expenseReminderCard
                      : styles.incomeReminderCard,
                    isUrgent && styles.urgentCard,
                  ]}
                >
                  <View style={styles.reminderContent}>
                    <View style={styles.reminderHeader}>
                      <Ionicons
                        name={
                          reminder.type === 'expense'
                            ? 'trending-down'
                            : 'trending-up'
                        }
                        size={20}
                        color={
                          reminder.type === 'expense' ? '#f87171' : '#34d399'
                        }
                      />
                      <Text style={styles.reminderTitle}>{reminder.title}</Text>
                      {reminder.recurring && (
                        <View style={styles.recurringBadge}>
                          <Text style={styles.recurringText}>Recurring</Text>
                        </View>
                      )}
                      {reminder.notificationId && (
                        <Ionicons name="notifications-circle" size={16} color="#0050A0" />
                      )}
                    </View>
                    <View style={styles.reminderDetails}>
                      <Text style={styles.reminderAmount}>
                        {symbol}
                        {reminder.amount.toFixed(2)} {reminder.currency}
                      </Text>
                      <Text style={styles.reminderCategory}>
                        • {reminder.category}
                      </Text>
                      <Text style={styles.reminderDueDate}>
                        • Due: {new Date(reminder.dueDate).toLocaleDateString()}
                      </Text>
                      <Text
                        style={[
                          styles.reminderDaysLeft,
                          isUrgent && styles.urgentText,
                        ]}
                      >
                        •{' '}
                        {daysUntil === 0
                          ? 'Due TODAY'
                          : `${daysUntil} day${daysUntil > 1 ? 's' : ''} left`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.markPaidButtonContainer}
                      onPress={() => {
                        setSelectedReminder(reminder);
                        setShowPaymentModal(true);
                      }}
                    >
                      <LinearGradient
                        colors={['#10b981', '#059669']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.markPaidButton}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#fff" />
                        <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => deleteReminder(reminder.id)}>
                    <Ionicons name="trash-outline" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {paidReminders.length > 0 && (
          <View style={styles.remindersContainer}>
            <Text style={styles.sectionTitle}>Recently Paid</Text>
            {paidReminders.map((reminder) => {
              const symbol = getCurrencySymbol(reminder.currency);

              return (
                <View
                  key={reminder.id}
                  style={[styles.reminderCard, styles.paidReminderCard]}
                >
                  <View style={styles.reminderContent}>
                    <View style={styles.reminderHeader}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#10b981"
                      />
                      <Text style={styles.reminderTitle}>{reminder.title}</Text>
                      <View style={styles.paidBadge}>
                        <Text style={styles.paidText}>Paid ✓</Text>
                      </View>
                    </View>
                    <View style={styles.reminderDetails}>
                      <Text style={styles.reminderAmount}>
                        {symbol}
                        {reminder.amount.toFixed(2)} {reminder.currency}
                      </Text>
                      <Text style={styles.reminderCategory}>
                        • {reminder.category}
                      </Text>
                      <Text style={styles.reminderDueDate}>
                        • Paid: {new Date(reminder.paidDate || '').toLocaleDateString()}
                      </Text>
                      {reminder.transactionId && (
                        <Text style={styles.transactionLinked}>
                          • Added to transactions
                        </Text>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => deleteReminder(reminder.id)}>
                    <Ionicons name="trash-outline" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Payment Confirmation Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <Text style={styles.paymentModalTitle}>Confirm Payment</Text>
            {selectedReminder && (
              <>
                <Text style={styles.paymentModalText}>
                  Mark this {selectedReminder.type} as paid?
                </Text>
                <View style={styles.paymentDetailsBox}>
                  <Text style={styles.paymentDetailTitle}>{selectedReminder.title}</Text>
                  <Text style={styles.paymentDetailAmount}>
                    {getCurrencySymbol(selectedReminder.currency)}
                    {selectedReminder.amount.toFixed(2)} {selectedReminder.currency}
                  </Text>
                  <Text style={styles.paymentDetailCategory}>
                    Category: {selectedReminder.category}
                  </Text>
                  {insertTransaction && (
                    <View style={styles.transactionNote}>
                      <Ionicons name="information-circle" size={20} color="#0050A0" />
                      <Text style={styles.transactionNoteText}>
                        This will be converted to KES and added to your transactions
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.paymentModalButtons}>
                  <TouchableOpacity
                    style={styles.paymentCancelButton}
                    onPress={() => {
                      setShowPaymentModal(false);
                      setSelectedReminder(null);
                    }}
                  >
                    <Text style={styles.paymentCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.paymentConfirmButtonContainer}
                    onPress={() => markAsPaid(selectedReminder)}
                  >
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.paymentConfirmButton}
                    >
                      <Text style={styles.paymentConfirmButtonText}>Confirm Payment</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Notification Settings</Text>
            <TouchableOpacity onPress={() => {
              setShowSettings(false);
              setTempNotificationTime(notificationTime);
            }}>
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.settingsContainer}>
            <Text style={styles.settingsLabel}>Notification Time</Text>
            <Text style={styles.settingsSubLabel}>
              Choose what time you want to receive daily reminders
            </Text>

            <View style={styles.timePickerContainer}>
              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Hour</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempNotificationTime.hour.toString().padStart(2, '0')}
                  onChangeText={(text) => {
                    const hour = parseInt(text) || 0;
                    if (hour >= 0 && hour <= 23) {
                      setTempNotificationTime({ ...tempNotificationTime, hour });
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              <View style={styles.timePicker}>
                <Text style={styles.timeLabel}>Minute</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempNotificationTime.minute.toString().padStart(2, '0')}
                  onChangeText={(text) => {
                    const minute = parseInt(text) || 0;
                    if (minute >= 0 && minute <= 59) {
                      setTempNotificationTime({ ...tempNotificationTime, minute });
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.presetTimesContainer}>
              <Text style={styles.presetTimesLabel}>Quick Select:</Text>
              <View style={styles.presetButtons}>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setTempNotificationTime({ hour: 8, minute: 0 })}
                >
                  <Text style={styles.presetButtonText}>8:00 AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setTempNotificationTime({ hour: 9, minute: 0 })}
                >
                  <Text style={styles.presetButtonText}>9:00 AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setTempNotificationTime({ hour: 12, minute: 0 })}
                >
                  <Text style={styles.presetButtonText}>12:00 PM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.presetButton}
                  onPress={() => setTempNotificationTime({ hour: 18, minute: 0 })}
                >
                  <Text style={styles.presetButtonText}>6:00 PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveSettingsButtonContainer}
              onPress={() => {
                saveNotificationTime(tempNotificationTime);
                setShowSettings(false);
              }}
            >
              <LinearGradient
                colors={['#80C545', '#0050A0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.saveSettingsButton}
              >
                <Text style={styles.saveSettingsButtonText}>Save Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Reminder Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Reminder</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'expense' && styles.typeButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, type: 'expense', category: '' })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'expense' && styles.typeButtonTextActive,
                  ]}
                >
                  Expense
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'income' && styles.typeButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, type: 'income', category: '' })}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    formData.type === 'income' && styles.typeButtonTextActive,
                  ]}
                >
                  Income
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Currency</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCurrencyPicker(true)}
            >
              <View style={styles.categoryInputContainer}>
                <Text style={styles.inputText}>
                  {getCurrencySymbol(formData.currency)} {formData.currency}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="e.g., Rent Payment"
            />

            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setShowCategoryPicker(true)}
            >
              <View style={styles.categoryInputContainer}>
                <Text style={[styles.inputText, !formData.category && styles.placeholderText]}>
                  {formData.category || 'Select a category'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={formData.dueDate}
              onChangeText={(text) =>
                setFormData({ ...formData, dueDate: text })
              }
              placeholder="2025-12-31"
            />

            <View style={styles.switchContainer}>
              <Text style={styles.label}>Recurring</Text>
              <Switch
                value={formData.recurring}
                onValueChange={(value) =>
                  setFormData({ ...formData, recurring: value })
                }
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButtonContainer} 
              onPress={addReminder}
            >
              <LinearGradient
                colors={['#80C545', '#0050A0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitButton}
              >
                <Text style={styles.submitButtonText}>Add Reminder</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Currency Picker Modal */}
      <Modal
        visible={showCurrencyPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Currency</Text>
            <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {CURRENCIES.map((currency) => (
              <TouchableOpacity
                key={currency.code}
                style={styles.currencyItem}
                onPress={() => {
                  setFormData({ ...formData, currency: currency.code });
                  setShowCurrencyPicker(false);
                }}
              >
                <View>
                  <Text style={styles.currencyItemCode}>{currency.code}</Text>
                  <Text style={styles.currencyItemName}>{currency.name}</Text>
                </View>
                <Text style={styles.currencyItemSymbol}>{currency.symbol}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select {formData.type === 'expense' ? 'Expense' : 'Income'} Category
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Ionicons name="close" size={28} color="#1f2937" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {(formData.type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPickerItem,
                  formData.category === category && styles.categoryPickerItemSelected
                ]}
                onPress={() => {
                  setFormData({ ...formData, category });
                  setShowCategoryPicker(false);
                }}
              >
                <Text style={[
                  styles.categoryPickerText,
                  formData.category === category && styles.categoryPickerTextSelected
                ]}>
                  {category}
                </Text>
                {formData.category === category && (
                  <Ionicons name="checkmark-circle" size={24} color="#0050A0" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  notificationTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F3FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  notificationTimeText: {
    fontSize: 14,
    color: '#0050A0',
    fontWeight: '600',
  },
  permissionWarning: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  permissionWarningText: {
    flex: 1,
  },
  permissionWarningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  permissionWarningSubtitle: {
    fontSize: 14,
    color: '#78350f',
  },
  notificationPanel: {
    backgroundColor: '#fed7aa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#1f2937',
  },
  notificationItem: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  notificationText: {
    color: '#1f2937',
    fontSize: 14,
  },
  clearButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  clearButtonText: {
    color: '#ea580c',
    fontWeight: '600',
  },
  statsContainer: {
    marginBottom: 16,
  },
  statCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  incomeCard: {
    backgroundColor: '#d1fae5',
  },
  expenseCard: {
    backgroundColor: '#fee2e2',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  currencyCode: {
    fontSize: 14,
    color: '#4b5563',
  },
  statAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButtonContainer: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0050A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  remindersContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  reminderCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseReminderCard: {
    backgroundColor: '#fee2e2',
  },
  incomeReminderCard: {
    backgroundColor: '#d1fae5',
  },
  paidReminderCard: {
    backgroundColor: '#f3f4f6',
    opacity: 0.8,
  },
  urgentCard: {
    borderWidth: 2,
    borderColor: '#f97316',
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  recurringBadge: {
    backgroundColor: '#0050A0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  recurringText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  paidBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  reminderDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  reminderAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  reminderCategory: {
    fontSize: 14,
    color: '#6b7280',
  },
  reminderDueDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  reminderDaysLeft: {
    fontSize: 14,
    color: '#6b7280',
  },
  urgentText: {
    color: '#ea580c',
    fontWeight: 'bold',
  },
  transactionLinked: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  markPaidButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  markPaidButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  paymentModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  paymentModalText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  paymentDetailsBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  paymentDetailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  paymentDetailAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0050A0',
    marginBottom: 8,
  },
  paymentDetailCategory: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  transactionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E6F3FF',
    padding: 10,
    borderRadius: 8,
  },
  transactionNoteText: {
    fontSize: 13,
    color: '#0050A0',
    flex: 1,
  },
  paymentModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  paymentCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  paymentConfirmButtonContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  paymentConfirmButton: {
    padding: 14,
    alignItems: 'center',
  },
  paymentConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  settingsContainer: {
    padding: 16,
  },
  settingsLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  settingsSubLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  timePicker: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 2,
    borderColor: '#0050A0',
    borderRadius: 8,
    width: 80,
    height: 80,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginHorizontal: 16,
  },
  presetTimesContainer: {
    marginBottom: 32,
  },
  presetTimesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    backgroundColor: '#E6F3FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0050A0',
  },
  presetButtonText: {
    color: '#0050A0',
    fontWeight: '600',
  },
  saveSettingsButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0050A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveSettingsButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveSettingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: '#0050A0',
    backgroundColor: '#E6F3FF',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#0050A0',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  inputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  submitButtonContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0050A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  submitButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  currencyItemCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  currencyItemName: {
    fontSize: 14,
    color: '#6b7280',
  },
  currencyItemSymbol: {
    fontSize: 24,
    color: '#0050A0',
  },
  categoryInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  categoryPickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryPickerItemSelected: {
    backgroundColor: '#E6F3FF',
  },
  categoryPickerText: {
    fontSize: 16,
    color: '#1f2937',
  },
  categoryPickerTextSelected: {
    fontWeight: 'bold',
    color: '#0050A0',
  },
});