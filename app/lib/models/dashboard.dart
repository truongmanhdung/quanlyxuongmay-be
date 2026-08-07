import 'production_report.dart';

class DailyPoint {
  final DateTime date;
  final double quantity;
  final double amount;

  DailyPoint({required this.date, required this.quantity, required this.amount});

  factory DailyPoint.fromJson(Map<String, dynamic> json) => DailyPoint(
        date: DateTime.parse(json['date'] as String),
        quantity: (json['quantity'] as num).toDouble(),
        amount: (json['amount'] as num).toDouble(),
      );
}

class DashboardOverview {
  final String from;
  final String to;
  final double totalAmount;
  final double totalQuantity;
  final int batchCount;
  final int activeWorkerCount;
  final int workersWithSubmissions;
  final int activeCustomers;
  final int activeProducts;
  final List<DailyPoint> last7Days;
  final List<ProductionReport> recentSubmissions;

  DashboardOverview({
    required this.from,
    required this.to,
    required this.totalAmount,
    required this.totalQuantity,
    required this.batchCount,
    required this.activeWorkerCount,
    required this.workersWithSubmissions,
    required this.activeCustomers,
    required this.activeProducts,
    required this.last7Days,
    required this.recentSubmissions,
  });

  factory DashboardOverview.fromJson(Map<String, dynamic> json) => DashboardOverview(
        from: json['from'] as String,
        to: json['to'] as String,
        totalAmount: (json['totalAmount'] as num).toDouble(),
        totalQuantity: (json['totalQuantity'] as num).toDouble(),
        batchCount: json['batchCount'] as int? ?? 0,
        // Backend dat ten nguoc: activeWorkerCount = so cong nhan da gui bao cao (tu so),
        // totalWorkerCount = tong so cong nhan dang hoat dong (mau so).
        activeWorkerCount: json['totalWorkerCount'] as int? ?? 0,
        workersWithSubmissions: json['activeWorkerCount'] as int? ?? 0,
        activeCustomers: json['activeCustomers'] as int? ?? 0,
        activeProducts: json['activeProducts'] as int? ?? 0,
        last7Days: (json['last7Days'] as List<dynamic>)
            .map((e) => DailyPoint.fromJson(e as Map<String, dynamic>))
            .toList(),
        recentSubmissions: (json['recentSubmissions'] as List<dynamic>)
            .map((e) => ProductionReport.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}
