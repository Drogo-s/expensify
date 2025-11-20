import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Comprehensive list of world currencies
const CURRENCIES = [
  // Americas
  { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', flag: '🇦🇷' },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', flag: '🇨🇱' },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', flag: '🇨🇴' },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', flag: '🇵🇪' },
  
  // Europe
  { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
  
  // Asia
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
  { code: 'TWD', name: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
  
  // Middle East
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼' },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', flag: '🇮🇱' },
  
  // Africa
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', flag: '🇪🇬' },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', flag: '🇲🇦' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', flag: '🇪🇹' },
  
  // Oceania
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
  
  // Cryptocurrencies
  { code: 'BTC', name: 'Bitcoin', symbol: '₿', flag: '💰' },
  { code: 'ETH', name: 'Ethereum', symbol: 'Ξ', flag: '💰' },
];

interface CurrencyConverterButtonProps {
  onConversion?: (fromCurrency: string, toCurrency: string, rate: number) => void;
}

export default function CurrencyConverterButton({ onConversion }: CurrencyConverterButtonProps) {
  const [converterVisible, setConverterVisible] = useState(false);
  const [fromCurrency, setFromCurrency] = useState('KES');
  const [toCurrency, setToCurrency] = useState('USD');
  const [amount, setAmount] = useState('100');
  const [convertedAmount, setConvertedAmount] = useState('0');
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [selectingCurrency, setSelectingCurrency] = useState<'from' | 'to'>('from');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fromCurrencyData = CURRENCIES.find(c => c.code === fromCurrency) || CURRENCIES[0];
  const toCurrencyData = CURRENCIES.find(c => c.code === toCurrency) || CURRENCIES[1];

  // Fetch exchange rates
  const fetchExchangeRates = async (baseCurrency: string) => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
      const data = await response.json();
      setExchangeRates(data.rates);
      setLastUpdated(new Date());
      return data.rates;
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch exchange rates. Please try again.');
      console.error('Exchange rate fetch error:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fetch rates when converter opens
  useEffect(() => {
    if (converterVisible && !exchangeRates) {
      fetchExchangeRates(fromCurrency);
    }
  }, [converterVisible]);

  // Convert currency
  useEffect(() => {
    if (exchangeRates && amount) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount)) {
        const rate = exchangeRates[toCurrency] || 1;
        const result = numAmount * rate;
        setConvertedAmount(result.toFixed(2));
      }
    }
  }, [amount, exchangeRates, toCurrency]);

  const handleCurrencySelect = async (currency: typeof CURRENCIES[0]) => {
    if (selectingCurrency === 'from') {
      setFromCurrency(currency.code);
      await fetchExchangeRates(currency.code);
    } else {
      setToCurrency(currency.code);
    }
    setCurrencyModalVisible(false);
    setSearchQuery('');
  };

  const swapCurrencies = async () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
    await fetchExchangeRates(toCurrency);
  };

  const applyConversion = () => {
    if (onConversion && exchangeRates) {
      const rate = exchangeRates[toCurrency] || 1;
      onConversion(fromCurrency, toCurrency, rate);
      Alert.alert(
        'Currency Applied',
        `Your app currency has been changed to ${toCurrency}. All new transactions will be entered in ${toCurrency}.`,
        [{ text: 'OK', onPress: () => setConverterVisible(false) }]
      );
    }
  };

  const filteredCurrencies = CURRENCIES.filter(
    currency =>
      currency.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      currency.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatNumber = (num: string) => {
    const number = parseFloat(num);
    if (isNaN(number)) return '0';
    return number.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <View>
      {/* Main Button to Open Converter - NOW WITH GRADIENT */}
      <TouchableOpacity
        style={styles.mainButtonContainer}
        onPress={() => setConverterVisible(true)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#80C545', '#0050A0']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.mainButton}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.buttonIcon}>💱</Text>
            <View style={styles.buttonTextContainer}>
              <Text style={styles.buttonTitle}>Currency Converter</Text>
              <Text style={styles.buttonSubtitle}>Convert between 50+ currencies</Text>
            </View>
            <Text style={styles.buttonChevron}>›</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Currency Converter Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={converterVisible}
        onRequestClose={() => setConverterVisible(false)}
      >
        <View style={styles.converterContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setConverterVisible(false)}
              style={styles.backButton}
            >
              <Text style={styles.backButtonText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Currency Converter</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.scrollContent}>
            <View style={styles.content}>
              {/* From Currency Section */}
              <View style={styles.currencySection}>
                <Text style={styles.label}>From</Text>
                <TouchableOpacity
                  style={styles.currencyButton}
                  onPress={() => {
                    setSelectingCurrency('from');
                    setCurrencyModalVisible(true);
                  }}
                >
                  <View style={styles.currencyButtonContent}>
                    <Text style={styles.currencyFlag}>{fromCurrencyData.flag}</Text>
                    <View style={styles.currencyDetails}>
                      <Text style={styles.currencyCode}>{fromCurrencyData.code}</Text>
                      <Text style={styles.currencyName}>{fromCurrencyData.name}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>

                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="Enter amount"
                  placeholderTextColor="#999"
                />
                <Text style={styles.amountDisplay}>
                  {fromCurrencyData.symbol} {formatNumber(amount)}
                </Text>
              </View>

              {/* Swap Button */}
              <TouchableOpacity
                style={styles.swapButton}
                onPress={swapCurrencies}
                disabled={loading}
              >
                <Text style={styles.swapIcon}>⇅</Text>
              </TouchableOpacity>

              {/* To Currency Section */}
              <View style={styles.currencySection}>
                <Text style={styles.label}>To</Text>
                <TouchableOpacity
                  style={styles.currencyButton}
                  onPress={() => {
                    setSelectingCurrency('to');
                    setCurrencyModalVisible(true);
                  }}
                >
                  <View style={styles.currencyButtonContent}>
                    <Text style={styles.currencyFlag}>{toCurrencyData.flag}</Text>
                    <View style={styles.currencyDetails}>
                      <Text style={styles.currencyCode}>{toCurrencyData.code}</Text>
                      <Text style={styles.currencyName}>{toCurrencyData.name}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>

                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>Converting...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.convertedAmountBox}>
                      <Text style={styles.convertedAmount}>
                        {toCurrencyData.symbol} {formatNumber(convertedAmount)}
                      </Text>
                    </View>
                    {exchangeRates && (
                      <Text style={styles.rateInfo}>
                        1 {fromCurrency} = {exchangeRates[toCurrency]?.toFixed(4)} {toCurrency}
                      </Text>
                    )}
                  </>
                )}
              </View>

              {/* Apply Currency Button */}
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyConversion}
                disabled={loading || !exchangeRates}
              >
                <Text style={styles.applyButtonText}>
                  Apply {toCurrency} as Active Currency
                </Text>
              </TouchableOpacity>

              {/* Last Updated Info */}
              {lastUpdated && (
                <View style={styles.updateInfo}>
                  <Text style={styles.updateText}>
                    Last updated: {lastUpdated.toLocaleTimeString()}
                  </Text>
                  <TouchableOpacity onPress={() => fetchExchangeRates(fromCurrency)}>
                    <Text style={styles.refreshText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Quick Conversion Reference */}
              {exchangeRates && (
                <View style={styles.referenceBox}>
                  <Text style={styles.referenceTitle}>Quick Reference</Text>
                  <View style={styles.referenceRow}>
                    <Text style={styles.referenceText}>
                      1 {fromCurrency} = {exchangeRates[toCurrency]?.toFixed(2)} {toCurrency}
                    </Text>
                  </View>
                  <View style={styles.referenceRow}>
                    <Text style={styles.referenceText}>
                      10 {fromCurrency} = {(exchangeRates[toCurrency] * 10)?.toFixed(2)} {toCurrency}
                    </Text>
                  </View>
                  <View style={styles.referenceRow}>
                    <Text style={styles.referenceText}>
                      100 {fromCurrency} = {(exchangeRates[toCurrency] * 100)?.toFixed(2)} {toCurrency}
                    </Text>
                  </View>
                  <View style={styles.referenceRow}>
                    <Text style={styles.referenceText}>
                      1000 {fromCurrency} = {(exchangeRates[toCurrency] * 1000)?.toFixed(2)} {toCurrency}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Currency Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={currencyModalVisible}
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Select {selectingCurrency === 'from' ? 'Source' : 'Target'} Currency
                </Text>
                <Text style={styles.modalSubtitle}>{CURRENCIES.length} currencies available</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setCurrencyModalVisible(false);
                  setSearchQuery('');
                }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search currencies..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />

            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.currencyItem,
                    item.code === (selectingCurrency === 'from' ? fromCurrency : toCurrency) &&
                      styles.selectedCurrency,
                  ]}
                  onPress={() => handleCurrencySelect(item)}
                >
                  <View style={styles.currencyItemContent}>
                    <Text style={styles.currencyItemFlag}>{item.flag}</Text>
                    <View style={styles.currencyInfo}>
                      <Text style={styles.currencyItemCode}>{item.code}</Text>
                      <Text style={styles.currencyItemName}>{item.name}</Text>
                    </View>
                    <Text style={styles.currencySymbol}>{item.symbol}</Text>
                  </View>
                  {item.code === (selectingCurrency === 'from' ? fromCurrency : toCurrency) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainButtonContainer: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0050A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  mainButton: {
    borderRadius: 12,
    padding: 20,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  buttonSubtitle: {
    fontSize: 14,
    color: '#E0FFDA',
  },
  buttonChevron: {
    fontSize: 32,
    color: 'white',
    fontWeight: '300',
  },
  applyButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 18,
    marginTop: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  applyButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  converterContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 60,
  },
  scrollContent: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  currencySection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  currencyButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  currencyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  currencyDetails: {
    flex: 1,
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  currencyName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#999',
  },
  amountInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#007AFF',
    marginBottom: 8,
  },
  amountDisplay: {
    fontSize: 16,
    color: '#666',
    textAlign: 'right',
  },
  swapButton: {
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: -12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  swapIcon: {
    fontSize: 32,
    color: 'white',
    fontWeight: 'bold',
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  convertedAmountBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
  },
  convertedAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  rateInfo: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  updateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 8,
  },
  updateText: {
    fontSize: 12,
    color: '#999',
  },
  refreshText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  referenceBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  referenceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  referenceRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  referenceText: {
    fontSize: 15,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 10,
    fontSize: 16,
    color: '#333',
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedCurrency: {
    backgroundColor: '#E3F2FD',
  },
  currencyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyItemFlag: {
    fontSize: 32,
    marginRight: 12,
  },
  currencyInfo: {
    flex: 1,
  },
  currencyItemCode: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  currencyItemName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});