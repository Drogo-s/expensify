import * as React from "react";
import {
  Button,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  Modal,
  FlatList,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import Card from "./ui/Card";
import { Category, Transaction } from "../types";
import SegmentedControl from "@react-native-segmented-control/segmented-control";

interface AddTransactionProps {
  insertTransaction(transaction: Transaction): Promise<void>;
  currentCurrency: string;
  currencySymbol: string;
  categories: Category[];
}

export default function AddTransaction({
  insertTransaction,
  currentCurrency,
  currencySymbol,
  categories,
}: AddTransactionProps) {
  const [isAddingTransaction, setIsAddingTransaction] = React.useState<boolean>(false);
  const [currentTab, setCurrentTab] = React.useState<number>(0);
  const [selectedCategory, setSelectedCategory] = React.useState<Category | null>(null);
  const [amount, setAmount] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [categoryModalVisible, setCategoryModalVisible] = React.useState<boolean>(false);

  const type = currentTab === 0 ? "Expense" : "Income";

  const handleSave = async () => {
    if (!amount || !selectedCategory) {
      alert("Please enter an amount and select a category");
      return;
    }

    const transaction: Transaction = {
      id: Math.floor(Math.random() * 1000000),
      category_id: selectedCategory.id,
      amount: parseFloat(amount),
      date: Math.floor(Date.now() / 1000),
      description: description || "",
      type: type as "Expense" | "Income",
    };

    await insertTransaction(transaction);

    // Reset form
    setAmount("");
    setDescription("");
    setSelectedCategory(null);
    setCurrentTab(0);
    setIsAddingTransaction(false);
  };

  const expenseCategories = categories.filter((cat) => cat.type === "Expense");
  const incomeCategories = categories.filter((cat) => cat.type === "Income");
  const availableCategories = currentTab === 0 ? expenseCategories : incomeCategories;

  return (
    <View style={styles.container}>
      {isAddingTransaction ? (
        <View>
          <Card style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.headerText}>Add Transaction</Text>
              <Text style={styles.currencyInfo}>
                Currency: {currentCurrency} ({currencySymbol})
              </Text>
            </View>

            {/* Transaction Type Selector */}
            <SegmentedControl
              values={["Expense", "Income"]}
              selectedIndex={currentTab}
              onChange={(event) => {
                setCurrentTab(event.nativeEvent.selectedSegmentIndex);
                setSelectedCategory(null); // Reset category when switching type
              }}
              style={styles.segmentedControl}
            />

            {/* Category Selection */}
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text style={styles.categoryButtonText}>
                {selectedCategory ? selectedCategory.name : "Select Category"}
              </Text>
              <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
            </TouchableOpacity>

            {/* Amount Input */}
            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>{currencySymbol}</Text>
              <TextInput
                placeholder="0.00"
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Description Input */}
            <TextInput
              placeholder="Description"
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setIsAddingTransaction(false);
                  setAmount("");
                  setDescription("");
                  setSelectedCategory(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Category Selection Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={categoryModalVisible}
            onRequestClose={() => setCategoryModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    Select {type} Category
                  </Text>
                  <TouchableOpacity
                    onPress={() => setCategoryModalVisible(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={availableCategories}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.categoryItem,
                        selectedCategory?.id === item.id && styles.selectedCategoryItem,
                      ]}
                      onPress={() => {
                        setSelectedCategory(item);
                        setCategoryModalVisible(false);
                      }}
                    >
                      <Text style={styles.categoryItemText}>{item.name}</Text>
                      {selectedCategory?.id === item.id && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          </Modal>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButtonContainer}
          onPress={() => setIsAddingTransaction(true)}
        >
          <LinearGradient
            colors={['#80C545', '#0050A0']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButton}
          >
            <MaterialIcons name="add-circle" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Add New Transaction</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  currencyInfo: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
  segmentedControl: {
    marginBottom: 16,
  },
  categoryButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  categoryButtonText: {
    fontSize: 16,
    color: "#333",
  },
  amountContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  descriptionInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  addButtonContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#0050A0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 20,
    color: "#666",
  },
  categoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  selectedCategoryItem: {
    backgroundColor: "#E3F2FD",
  },
  categoryItemText: {
    fontSize: 16,
    color: "#333",
  },
  checkmark: {
    fontSize: 20,
    color: "#007AFF",
    fontWeight: "bold",
  },
});