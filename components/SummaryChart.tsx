import * as React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSQLiteContext } from "expo-sqlite";

interface SummaryChartProps {
  currencySymbol?: string;
  convertAmount?: (amount: number) => number;
}

interface CategoryTotal {
  category: string;
  total: number;
  color: string;
  percentage: number;
}

type Period = "day" | "week" | "month";

export default function SummaryChart({ 
  currencySymbol = "KSh",
  convertAmount = (amount) => amount 
}: SummaryChartProps) {
  const db = useSQLiteContext();
  const [selectedPeriod, setSelectedPeriod] = React.useState<Period>("month");
  const [expenseCategoryTotals, setExpenseCategoryTotals] = React.useState<CategoryTotal[]>([]);
  const [incomeCategoryTotals, setIncomeCategoryTotals] = React.useState<CategoryTotal[]>([]);
  const [totalExpenses, setTotalExpenses] = React.useState<number>(0);
  const [totalIncome, setTotalIncome] = React.useState<number>(0);

  React.useEffect(() => {
    fetchData();
  }, [selectedPeriod]);

  function getDateRange(period: Period) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date();

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      case "week":
        const dayOfWeek = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - dayOfWeek);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
    }

    return {
      start: Math.floor(startDate.getTime() / 1000),
      end: Math.floor(endDate.getTime() / 1000)
    };
  }

  async function fetchData() {
    const { start, end } = getDateRange(selectedPeriod);

    // Get category-wise expenses
    const categoryExpenses = await db.getAllAsync<any>(
      `
      SELECT 
        c.name as category,
        SUM(t.amount) as total,
        c.id
      FROM Transactions t
      INNER JOIN Categories c ON t.category_id = c.id
      WHERE t.type = 'Expense' 
        AND t.date >= ? 
        AND t.date <= ?
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 5
    `,
      [start, end]
    );

    // Get category-wise income
    const categoryIncome = await db.getAllAsync<any>(
      `
      SELECT 
        c.name as category,
        SUM(t.amount) as total,
        c.id
      FROM Transactions t
      INNER JOIN Categories c ON t.category_id = c.id
      WHERE t.type = 'Income' 
        AND t.date >= ? 
        AND t.date <= ?
      GROUP BY c.id, c.name
      ORDER BY total DESC
      LIMIT 5
    `,
      [start, end]
    );

    // Get total income and expenses
    const totals = await db.getAllAsync<any>(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'Expense' THEN amount ELSE 0 END), 0) AS totalExpenses,
        COALESCE(SUM(CASE WHEN type = 'Income' THEN amount ELSE 0 END), 0) AS totalIncome
      FROM Transactions
      WHERE date >= ? AND date <= ?;
    `,
      [start, end]
    );

    const expenseTotal = totals[0]?.totalExpenses || 0;
    const incomeTotal = totals[0]?.totalIncome || 0;
    setTotalExpenses(expenseTotal);
    setTotalIncome(incomeTotal);

    // Assign colors to expense categories
    const expenseColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];
    const formattedExpenses = categoryExpenses.map((item, index) => ({
      category: item.category,
      total: item.total,
      color: expenseColors[index % expenseColors.length],
      percentage: expenseTotal > 0 ? (item.total / expenseTotal) * 100 : 0,
    }));

    // Assign colors to income categories
    const incomeColors = ["#4CAF50", "#8BC34A", "#CDDC39", "#66BB6A", "#81C784"];
    const formattedIncome = categoryIncome.map((item, index) => ({
      category: item.category,
      total: item.total,
      color: incomeColors[index % incomeColors.length],
      percentage: incomeTotal > 0 ? (item.total / incomeTotal) * 100 : 0,
    }));

    setExpenseCategoryTotals(formattedExpenses);
    setIncomeCategoryTotals(formattedIncome);
  }

  const savings = totalIncome - totalExpenses;
  
  const getPeriodLabel = () => {
    const now = new Date();
    switch (selectedPeriod) {
      case "day":
        return now.toLocaleDateString("default", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      case "week":
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return `${startOfWeek.toLocaleDateString("default", { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}`;
      case "month":
      default:
        return now.toLocaleDateString("default", {
          month: "long",
          year: "numeric",
        });
    }
  };

  const formatMoney = (value: number) => {
    const absValue = Math.abs(convertAmount(value)).toFixed(2);
    return `${value < 0 ? "-" : ""}${currencySymbol}${absValue}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === "day" && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod("day")}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === "day" && styles.periodButtonTextActive]}>
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === "week" && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod("week")}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === "week" && styles.periodButtonTextActive]}>
            Week
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === "month" && styles.periodButtonActive]}
          onPress={() => setSelectedPeriod("month")}
        >
          <Text style={[styles.periodButtonText, selectedPeriod === "month" && styles.periodButtonTextActive]}>
            Month
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.periodTitle}>{getPeriodLabel()}</Text>

      {/* Summary Cards */}
      <View style={styles.summaryCards}>
        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryAmount, styles.incomeText]}>
            {formatMoney(totalIncome)}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryAmount, styles.expenseText]}>
            {formatMoney(totalExpenses)}
          </Text>
        </View>

        <View style={[styles.summaryCard, styles.savingsCard]}>
          <Text style={styles.summaryLabel}>Savings</Text>
          <Text
            style={[
              styles.summaryAmount,
              savings >= 0 ? styles.incomeText : styles.expenseText,
            ]}
          >
            {formatMoney(savings)}
          </Text>
        </View>
      </View>

      {/* Income by Category */}
      {incomeCategoryTotals.length > 0 && (
        <View style={styles.categoryBreakdown}>
          <Text style={styles.chartTitle}>Income by Category</Text>
          
          {/* Visual Bar Chart */}
          <View style={styles.barChartContainer}>
            {incomeCategoryTotals.map((item, index) => (
              <View key={index} style={styles.barRow}>
                <View style={styles.barLabelContainer}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={styles.barLabel}>{item.category}</Text>
                </View>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        width: `${item.percentage}%`, 
                        backgroundColor: item.color 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barAmount}>{formatMoney(item.total)}</Text>
              </View>
            ))}
          </View>

          {/* Category List */}
          <View style={styles.categoryList}>
            {incomeCategoryTotals.map((item, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                  <View style={styles.categoryTextContainer}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <Text style={styles.categoryPercentage}>
                      {item.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.categoryAmount}>{formatMoney(item.total)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Expenses by Category */}
      {expenseCategoryTotals.length > 0 && (
        <View style={styles.categoryBreakdown}>
          <Text style={styles.chartTitle}>Expenses by Category</Text>
          
          {/* Visual Bar Chart */}
          <View style={styles.barChartContainer}>
            {expenseCategoryTotals.map((item, index) => (
              <View key={index} style={styles.barRow}>
                <View style={styles.barLabelContainer}>
                  <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                  <Text style={styles.barLabel}>{item.category}</Text>
                </View>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        width: `${item.percentage}%`, 
                        backgroundColor: item.color 
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.barAmount}>{formatMoney(item.total)}</Text>
              </View>
            ))}
          </View>

          {/* Category List */}
          <View style={styles.categoryList}>
            {expenseCategoryTotals.map((item, index) => (
              <View key={index} style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                  <View style={styles.categoryTextContainer}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <Text style={styles.categoryPercentage}>
                      {item.percentage.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.categoryAmount}>{formatMoney(item.total)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {incomeCategoryTotals.length === 0 && expenseCategoryTotals.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📊</Text>
          <Text style={styles.emptyStateText}>
            No transactions recorded for this period
          </Text>
          <Text style={styles.emptyStateSubtext}>
            Start adding transactions to see your breakdown
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  periodButtonActive: {
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  periodButtonTextActive: {
    color: "#333",
  },
  periodTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  summaryCards: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  incomeCard: {
    backgroundColor: "#E8F5E9",
  },
  expenseCard: {
    backgroundColor: "#FFEBEE",
  },
  savingsCard: {
    backgroundColor: "#E3F2FD",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    fontWeight: "600",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "bold",
  },
  incomeText: {
    color: "#2e8b57",
  },
  expenseText: {
    color: "#ff4500",
  },
  categoryBreakdown: {
    marginTop: 16,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  barChartContainer: {
    marginBottom: 24,
  },
  barRow: {
    marginBottom: 12,
  },
  barLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  barContainer: {
    height: 24,
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 2,
  },
  bar: {
    height: "100%",
    borderRadius: 12,
  },
  barAmount: {
    fontSize: 12,
    color: "#999",
    textAlign: "right",
  },
  categoryList: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  categoryTextContainer: {
    flex: 1,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  categoryPercentage: {
    fontSize: 12,
    color: "#999",
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});