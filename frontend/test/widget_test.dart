// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:frontend/main.dart';

void main() {
  testWidgets('RJBC app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RJBCApp());

    // Verify that the app bar title is displayed.
    expect(find.text('RJBC'), findsOneWidget);

    // Verify that the loading indicator is shown initially.
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    // Wait for the async fetch to complete and trigger frames.
    await tester.pumpAndSettle();

    // After settling, either the error or info card should be displayed.
    // We verify at least one of the expected widgets is present.
    expect(
      find.byWidgetPredicate(
        (widget) =>
            widget is Icon &&
            (widget.icon == Icons.error_outline || widget.icon == Icons.check_circle),
      ),
      findsOneWidget,
    );
  });
}
