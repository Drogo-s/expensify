import * as React from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextStyle,
  View,
  TouchableOpacity,
} from "react-native";
import { Category, Transaction, TransactionsByMonth } from "../types";
import { useSQLiteContext } from "expo-sqlite";
import TransactionList from "../components/TransactionsList";
import Card from "../components/ui/Card";
import AddTransaction from "../components/AddTransaction";
import ExpenseIncomeReminder from "../screens/ExpenseIncomeReminder";
import { useNavigation } from "@react-navigation/native";
import SummaryChart from "../components/SummaryChart";
import CurrencyConverterButton from "../components/CurrencyPicker";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface HomeProps {
  currentCurrency?: string;
  currencySymbol?: string;
  exchangeRates?: any;
}

export default function Home({ 
  currentCurrency = 'KES', 
  currencySymbol = 'KSh',
  exchangeRates 
}: HomeProps) {
  const navigation = useNavigation();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [transactionsByMonth, setTransactionsByMonth] =
    React.useState<TransactionsByMonth>({
      totalExpenses: 0,
      totalIncome: 0,
    });
  
  const [activeCurrency, setActiveCurrency] = React.useState(currentCurrency);
  const [activeCurrencySymbol, setActiveCurrencySymbol] = React.useState(currencySymbol);
  const [activeExchangeRate, setActiveExchangeRate] = React.useState(1);
  const [showReminders, setShowReminders] = React.useState(false);

  const db = useSQLiteContext();

  React.useEffect(() => {
    db.withTransactionAsync(async () => {
      await getData();
    });
  }, [db]);

  async function getData() {
    const result = await db.getAllAsync<Transaction>(
      `SELECT * FROM Transactions 
        ORDER BY date DESC 
        LIMIT 10;`
    );
    setTransactions(result);

    const categoriesResult = await db.getAllAsync<Category>(
      `SELECT * FROM Categories;`
    );
    setCategories(categoriesResult);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    endOfMonth.setMilliseconds(endOfMonth.getMilliseconds() - 1);

    const startOfMonthTimestamp = Math.floor(startOfMonth.getTime() / 1000);
    const endOfMonthTimestamp = Math.floor(endOfMonth.getTime() / 1000);

    const transactionsByMonth = await db.getAllAsync<TransactionsByMonth>(
      `
       SELECT
         COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) AS totalExpenses,
         COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) AS totalIncome
       FROM Transactions
       WHERE date >= ? AND date <= ?;
     `,
      [startOfMonthTimestamp, endOfMonthTimestamp]
    );
    setTransactionsByMonth(transactionsByMonth[0]);
  }

  async function deleteAllTransactions() {
    db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM Transactions;`);
      await getData();
    });
  }

  async function deleteTransaction(id: number) {
    db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM Transactions WHERE id = ?;`, [id]);
      await getData();
    });
  }

  async function insertTransaction(transaction: Transaction) {
    // The amount passed here is already in KES (base currency)
    db.withTransactionAsync(async () => {
      await db.runAsync(
        `
         INSERT INTO Transactions (category_id, amount, date, description, type) VALUES (?, ?, ?, ?, ?);
       `,
        [
          transaction.category_id,
          transaction.amount, // Already in KES
          transaction.date,
          transaction.description,
          transaction.type,
        ]
      );
      await getData(); // Refresh all data after insertion
    });
  }

  const handleCurrencyConversion = (fromCurrency: string, toCurrency: string, exchangeRate: number) => {
    const CURRENCIES = [
      { code: 'USD', symbol: '$' },
      { code: 'EUR', symbol: '€' },
      { code: 'GBP', symbol: '£' },
      { code: 'KES', symbol: 'KSh' },
      { code: 'CAD', symbol: 'C$' },
      { code: 'AUD', symbol: 'A$' },
      { code: 'JPY', symbol: '¥' },
      { code: 'CNY', symbol: '¥' },
      { code: 'INR', symbol: '₹' },
    ];

    const currencyData = CURRENCIES.find(c => c.code === toCurrency);
    const newSymbol = currencyData?.symbol || toCurrency;

    if (fromCurrency === 'KES') {
      setActiveCurrency(toCurrency);
      setActiveCurrencySymbol(newSymbol);
      setActiveExchangeRate(exchangeRate);
    } 
    else if (toCurrency === 'KES') {
      setActiveCurrency('KES');
      setActiveCurrencySymbol('KSh');
      setActiveExchangeRate(1);
    }
    else {
      setActiveCurrency(toCurrency);
      setActiveCurrencySymbol(newSymbol);
      setActiveExchangeRate(exchangeRate);
    }
  };

  const convertAmount = (amountInKES: number) => {
    return amountInKES * activeExchangeRate;
  };

  const handleReminderPaid = async (reminder: any) => {
    console.log('Reminder paid successfully:', reminder);
    // Refresh all data to show the new transaction
    await getData();
  };

  // If showing reminders, render the reminder component with back button
  if (showReminders) {
    return (
      <View style={{ flex: 1 }}>
        {/* Back Button Header */}
        <View style={styles.reminderHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowReminders(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#0050A0" />
            <Text style={styles.backButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
        
        <ExpenseIncomeReminder
          insertTransaction={insertTransaction}
          categories={categories}
          currentCurrency={activeCurrency}
          exchangeRate={activeExchangeRate}
          onReminderPaid={async (reminder) => {
            await handleReminderPaid(reminder);
            // Stay on reminders page after payment, don't auto-close
          }}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={{
          padding: 15,
          paddingVertical: Platform.OS === "ios" ? 170 : 16,
        }}
      >
        <CurrencyConverterButton onConversion={handleCurrencyConversion} />

        <Card style={styles.currencyInfoCard}>
          <Text style={styles.currencyInfoText}>
            Active Currency: {activeCurrency} ({activeCurrencySymbol})
          </Text>
          <Text style={styles.currencyInfoSubtext}>
            All amounts shown in {activeCurrency}. New entries will be converted and saved.
          </Text>
        </Card>

        {/* Reminders Button - Opens Reminders in Same Screen */}
        <TouchableOpacity 
          style={styles.remindersButtonContainer}
          onPress={() => setShowReminders(true)}
        >
          <LinearGradient
            colors={['#80C545', '#0050A0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.remindersButton}
          >
            <View style={styles.remindersButtonContent}>
              <Ionicons name="notifications" size={24} color="#fff" />
              <View style={styles.remindersButtonText}>
                <Text style={styles.remindersButtonTitle}>Financial Reminders</Text>
                <Text style={styles.remindersButtonSubtitle}>
                  Set up alerts for upcoming expenses & income
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <AddTransaction 
          insertTransaction={insertTransaction}
          currentCurrency={activeCurrency}
          currencySymbol={activeCurrencySymbol}
          categories={categories}
        />
        
        <TouchableOpacity 
          style={styles.deleteButtonContainer}
          onPress={deleteAllTransactions}
        >
          <LinearGradient
            colors={['#80C545', '#0050A0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>Delete All Transactions</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TransactionSummary
          totalExpenses={convertAmount(transactionsByMonth.totalExpenses)}
          totalIncome={convertAmount(transactionsByMonth.totalIncome)}
          currencySymbol={activeCurrencySymbol}
        />
        
        <TransactionList
          categories={categories}
          transactions={transactions}
          deleteTransaction={deleteTransaction}
          currencySymbol={activeCurrencySymbol}
          convertAmount={convertAmount}
        />
      </ScrollView>
    </>
  );
}

interface TransactionSummaryProps extends TransactionsByMonth {
  currencySymbol: string;
}

function TransactionSummary({
  totalIncome,
  totalExpenses,
  currencySymbol,
}: TransactionSummaryProps) {
  const savings = totalIncome - totalExpenses;
  const readablePeriod = new Date().toLocaleDateString("default", {
    month: "long",
    year: "numeric",
  });

  const getMoneyTextStyle = (value: number): TextStyle => ({
    fontWeight: "bold",
    color: value < 0 ? "#ff4500" : "#2A9D8F", 
  });

  const formatMoney = (value: number) => {
    const absValue = Math.abs(value).toFixed(2);
    return `${value < 0 ? "-" : ""}${currencySymbol}${absValue}`;
  };

  return (
    <>
      <Card style={styles.container}>
        <SummaryChart />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    paddingBottom: 7,
  },
  currencyInfoCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#E6F3FF',
  },
  currencyInfoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0050A0',
    marginBottom: 4,
  },
  currencyInfoSubtext: {
    fontSize: 12,
    color: '#333',
  },
  reminderHeader: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0050A0',
  },
  remindersButtonContainer: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0050A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  remindersButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  remindersButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  remindersButtonText: {
    flex: 1,
  },
  remindersButtonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  remindersButtonSubtitle: {
    fontSize: 13,
    color: '#E0FFDA',
  },
  deleteButtonContainer: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0050A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  deleteButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  blur: {
    width: "100%",
    height: 110,
    position: "absolute",
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "#00000010",
    padding: 16,
  },
  periodTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  summaryText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 10,
  },
});