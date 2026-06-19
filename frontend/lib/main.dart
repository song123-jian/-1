import 'dart:convert';
import 'dart:io' show Platform;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const RJBCApp());
}

class RJBCApp extends StatelessWidget {
  const RJBCApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RJBC',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // Go 后端 API 地址（APK 连电脑局域网IP，EXE 单机模式用 localhost）
  final String _baseUrl = Platform.isAndroid
      ? 'http://192.168.1.5:8080'
      : 'http://localhost:8080';
  Map<String, dynamic>? _info;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _fetchInfo();
  }

  Future<void> _fetchInfo() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await http.get(Uri.parse('$_baseUrl/api/info'));
      if (response.statusCode == 200) {
        setState(() {
          _info = jsonDecode(response.body);
          _loading = false;
        });
      } else {
        setState(() {
          _error = '服务器返回: ${response.statusCode}';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = '无法连接后端: $e';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('RJBC'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchInfo,
          ),
        ],
      ),
      body: Center(
        child: _loading
            ? const CircularProgressIndicator()
            : _error != null
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.error_outline,
                          size: 64, color: Colors.red),
                      const SizedBox(height: 16),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _fetchInfo,
                        child: const Text('重试'),
                      ),
                    ],
                  )
                : Card(
                    margin: const EdgeInsets.all(32),
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.check_circle,
                              size: 64, color: Colors.green),
                          const SizedBox(height: 16),
                          Text(
                            '应用名称: ${_info?['name'] ?? '-'}',
                            style: const TextStyle(fontSize: 18),
                          ),
                          Text('版本: ${_info?['version'] ?? '-'}'),
                          Text('系统: ${_info?['os'] ?? '-'}'),
                          Text('架构: ${_info?['arch'] ?? '-'}'),
                        ],
                      ),
                    ),
                  ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _fetchInfo,
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
