import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:iconsax_flutter/iconsax_flutter.dart';
import 'package:provider/provider.dart';
import 'package:syncfusion_flutter_charts/charts.dart';
import '../../core/api_client.dart';
import '../../core/format.dart';
import '../../core/page_transition.dart';
import '../../core/socket_service.dart';
import '../../core/theme.dart';
import '../../models/dashboard.dart';
import '../../services/dashboard_service.dart';
import '../../widgets/date_range_filter.dart';
import '../../widgets/report_tile.dart';
import '../../widgets/stat_card.dart';
import 'workers_screen.dart';

class DashboardScreen extends StatefulWidget {
  final ValueChanged<int>? onNavigateTab;
  const DashboardScreen({super.key, this.onNavigateTab});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  DateRange range = DateRange.defaultRange();
  DashboardOverview? data;
  bool loading = true;
  String? error;
  bool showRevenue = false;
  late final SocketService _socket;

  void _handleRealtimeEvent(dynamic _) => _load();

  @override
  void initState() {
    super.initState();
    _load();
    _socket = context.read<SocketService>();
    _socket.on('report:new', _handleRealtimeEvent);
    _socket.on('defect:new', _handleRealtimeEvent);
  }

  @override
  void dispose() {
    _socket.off('report:new', _handleRealtimeEvent);
    _socket.off('defect:new', _handleRealtimeEvent);
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      loading = true;
      error = null;
    });
    final api = context.read<ApiClient>();
    try {
      final res = await DashboardService(api).overview(from: range.fromIso, to: range.toIso);
      setState(() {
        data = res;
        loading = false;
      });
    } catch (e) {
      setState(() {
        error = 'Không tải được dữ liệu tổng quan';
        loading = false;
      });
    }
  }

  void _changeRange(DateRange next) {
    setState(() => range = next);
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tổng quan')),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(child: Text(error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          Expanded(child: DateRangeFilterButton(range: range, onChanged: _changeRange)),
                          const SizedBox(width: 8),
                          _MiniChip(icon: Iconsax.people, value: '${data!.activeCustomers}'),
                          const SizedBox(width: 8),
                          _MiniChip(icon: Iconsax.box, value: '${data!.activeProducts}'),
                        ],
                      ),
                      const SizedBox(height: 12),
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.1,
                        children: [
                          StatCard(
                            icon: Iconsax.dollar_circle,
                            label: 'Tổng lương đã hoàn thành',
                            value: formatCurrency(data!.totalAmount),
                            onTap: () => widget.onNavigateTab?.call(2),
                          ),
                          StatCard(
                            icon: Iconsax.box,
                            label: 'Tổng sản lượng đã duyệt',
                            value: '${formatNumber(data!.totalQuantity)} sp',
                            onTap: () => widget.onNavigateTab?.call(1),
                          ),
                          StatCard(
                            icon: Iconsax.task_square,
                            label: 'Lượt báo cáo đã duyệt',
                            value: formatNumber(data!.reportCount),
                            onTap: () => widget.onNavigateTab?.call(1),
                          ),
                          StatCard(
                            icon: Iconsax.people,
                            label: 'Công nhân hoạt động',
                            value: '${data!.workersWithSubmissions}/${data!.activeWorkerCount}',
                            onTap: () => Navigator.of(context).push(slideRoute(const WorkersScreen())),
                          ),
                        ],
                      ).animate().fadeIn(duration: 300.ms).slideY(begin: 0.08, end: 0),
                      const SizedBox(height: 20),
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      showRevenue ? 'Doanh thu ${data!.last7Days.length} ngày gần nhất' : 'Sản lượng ${data!.last7Days.length} ngày gần nhất',
                                      style: const TextStyle(fontWeight: FontWeight.w700),
                                    ),
                                  ),
                                  _ChartToggle(showRevenue: showRevenue, onChanged: (v) => setState(() => showRevenue = v)),
                                ],
                              ),
                              const SizedBox(height: 16),
                              SizedBox(
                                height: 220,
                                child: showRevenue ? _RevenueChart(points: data!.last7Days) : _WeeklyChart(points: data!.last7Days),
                              ),
                            ],
                          ),
                        ),
                      ).animate().fadeIn(duration: 300.ms, delay: 80.ms).slideY(begin: 0.08, end: 0),
                      const SizedBox(height: 20),
                      const Text('Thông báo gửi sản lượng', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      const SizedBox(height: 12),
                      if (data!.recentSubmissions.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 20),
                          child: Center(child: Text('Chưa có báo cáo sản lượng nào')),
                        )
                      else
                        for (var i = 0; i < data!.recentSubmissions.length; i++)
                          ReportTile(report: data!.recentSubmissions[i], showWorker: true)
                              .animate()
                              .fadeIn(duration: 250.ms, delay: (120 + i * 40).ms)
                              .slideY(begin: 0.06, end: 0),
                    ],
                  ),
                ),
    );
  }
}

class _MiniChip extends StatelessWidget {
  final IconData icon;
  final String value;
  const _MiniChip({required this.icon, required this.value});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? AppColors.brand500.withValues(alpha: 0.15) : AppColors.brand50,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.brand500),
          const SizedBox(width: 4),
          Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.brand600)),
        ],
      ),
    );
  }
}

class _ChartToggle extends StatelessWidget {
  final bool showRevenue;
  final ValueChanged<bool> onChanged;
  const _ChartToggle({required this.showRevenue, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF0B1220) : AppColors.gray100,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ChartToggleItem(label: 'Sản lượng', selected: !showRevenue, onTap: () => onChanged(false)),
          _ChartToggleItem(label: 'Doanh thu', selected: showRevenue, onTap: () => onChanged(true)),
        ],
      ),
    );
  }
}

class _ChartToggleItem extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _ChartToggleItem({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.brand500 : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : AppColors.gray500,
          ),
        ),
      ),
    );
  }
}

// Bieu do cot (Syncfusion) the cho fl_chart cu: bo goc bo, gradient, track-ball tooltip mem hon.
class _WeeklyChart extends StatelessWidget {
  final List<DailyPoint> points;
  const _WeeklyChart({required this.points});

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const Center(child: Text('Chưa có dữ liệu'));
    }
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final axisLabelStyle = TextStyle(fontSize: 10, color: AppColors.gray400);
    return SfCartesianChart(
      plotAreaBorderWidth: 0,
      margin: EdgeInsets.zero,
      primaryXAxis: CategoryAxis(
        majorGridLines: const MajorGridLines(width: 0),
        axisLine: const AxisLine(width: 0),
        majorTickLines: const MajorTickLines(size: 0),
        labelStyle: axisLabelStyle,
      ),
      primaryYAxis: NumericAxis(
        isVisible: false,
        majorGridLines: const MajorGridLines(width: 0),
      ),
      tooltipBehavior: TooltipBehavior(
        enable: true,
        builder: (data, point, series, pointIndex, seriesIndex) => _ChartTooltip(text: formatNumber((data as DailyPoint).quantity)),
      ),
      series: <CartesianSeries>[
        ColumnSeries<DailyPoint, String>(
          dataSource: points,
          xValueMapper: (p, _) => '${p.date.day}/${p.date.month}',
          yValueMapper: (p, _) => p.quantity,
          width: 0.55,
          borderRadius: BorderRadius.circular(6),
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [AppColors.brand600, isDark ? AppColors.brand300 : AppColors.brand300],
          ),
          animationDuration: 600,
        ),
      ],
    );
  }
}

// Bieu do vung (Syncfusion) cho doanh thu: duong cong mem + gradient do duoi mem hon LineChart cu.
class _RevenueChart extends StatelessWidget {
  final List<DailyPoint> points;
  const _RevenueChart({required this.points});

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const Center(child: Text('Chưa có dữ liệu'));
    }
    final axisLabelStyle = TextStyle(fontSize: 10, color: AppColors.gray400);
    return SfCartesianChart(
      plotAreaBorderWidth: 0,
      margin: EdgeInsets.zero,
      primaryXAxis: CategoryAxis(
        majorGridLines: const MajorGridLines(width: 0),
        axisLine: const AxisLine(width: 0),
        majorTickLines: const MajorTickLines(size: 0),
        labelStyle: axisLabelStyle,
      ),
      primaryYAxis: NumericAxis(
        isVisible: false,
        majorGridLines: const MajorGridLines(width: 0),
      ),
      tooltipBehavior: TooltipBehavior(
        enable: true,
        builder: (data, point, series, pointIndex, seriesIndex) => _ChartTooltip(text: formatCurrency((data as DailyPoint).amount)),
      ),
      series: <CartesianSeries>[
        SplineAreaSeries<DailyPoint, String>(
          dataSource: points,
          xValueMapper: (p, _) => '${p.date.day}/${p.date.month}',
          yValueMapper: (p, _) => p.amount,
          borderColor: AppColors.brand500,
          borderWidth: 3,
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [AppColors.brand500.withValues(alpha: 0.32), AppColors.brand500.withValues(alpha: 0.0)],
          ),
          markerSettings: const MarkerSettings(
            isVisible: true,
            height: 7,
            width: 7,
            borderWidth: 2,
            borderColor: Colors.white,
            color: AppColors.brand500,
          ),
          animationDuration: 600,
        ),
      ],
    );
  }
}

class _ChartTooltip extends StatelessWidget {
  final String text;
  const _ChartTooltip({required this.text});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(color: AppColors.brand600, borderRadius: BorderRadius.circular(8)),
      child: Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
    );
  }
}
