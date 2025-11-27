"""
Test Script for StateFarm AI Fraud Detection
Demonstrates the difference between heuristic and AI-powered analysis
"""

import json
from fraud_detection_service import FraudDetectionService

def legacy_heuristic_analysis(claim_data):
    """
    Legacy heuristic-based fraud detection (for comparison)
    This is what the old system would have done
    """
    score = 0
    indicators = []
    
    # Heuristic Rule 1: Claim filed soon after policy start
    if claim_data.get('days_since_policy_start', 0) < 30:
        score += 25
        indicators.append("Policy recently started")
    
    # Heuristic Rule 2: High claim amount
    if claim_data.get('claim_amount', 0) > 20000:
        score += 20
        indicators.append("High claim amount")
    
    # Heuristic Rule 3: No police report
    if claim_data.get('police_report_filed', '').lower() == 'no':
        score += 15
        indicators.append("No police report")
    
    # Heuristic Rule 4: Multiple previous claims
    if claim_data.get('previous_claims_count', 0) >= 3:
        score += 30
        indicators.append("Multiple previous claims")
    
    # Heuristic Rule 5: Long filing delay
    if claim_data.get('filing_delay_days', 0) > 14:
        score += 10
        indicators.append("Delayed filing")
    
    # Determine risk level
    if score >= 60:
        risk_level = "HIGH"
    elif score >= 30:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
    
    return {
        'method': 'heuristic',
        'fraud_score': score,
        'risk_level': risk_level,
        'fraud_indicators': indicators,
        'reasoning': 'Rule-based analysis using predefined patterns'
    }


def compare_analyses():
    """Compare heuristic vs AI analysis on sample claims"""
    
    print("=" * 80)
    print("StateFarm Fraud Detection: Heuristic vs AI Comparison")
    print("=" * 80)
    print()
    
    # Initialize AI service
    ai_service = FraudDetectionService()
    
    # Test Case 1: Suspicious claim
    print("TEST CASE 1: Potentially Fraudulent Claim")
    print("-" * 80)
    
    suspicious_claim = {
        'claim_id': 'CLM-TEST-001',
        'claim_type': 'Auto Collision',
        'claim_amount': 25000,
        'incident_date': '2024-01-15',
        'filing_date': '2024-01-20',
        'policy_holder': 'John Doe',
        'policy_number': 'POL-123456',
        'policy_start_date': '2024-01-10',
        'previous_claims_count': 0,
        'years_as_customer': 0.1,
        'incident_location': 'Los Angeles, CA',
        'incident_description': 'Rear-end collision, total loss',
        'witnesses': 'None',
        'police_report_filed': 'No',
        'days_since_policy_start': 5,
        'filing_delay_days': 5,
        'similar_claims_in_area': 0,
        'repair_provider': 'Cash Payment Requested'
    }
    
    print("\nClaim Details:")
    print(f"  - Claim ID: {suspicious_claim['claim_id']}")
    print(f"  - Amount: ${suspicious_claim['claim_amount']:,}")
    print(f"  - Days since policy start: {suspicious_claim['days_since_policy_start']}")
    print(f"  - Police report: {suspicious_claim['police_report_filed']}")
    print(f"  - Description: {suspicious_claim['incident_description']}")
    print()
    
    # Heuristic Analysis
    print("HEURISTIC ANALYSIS:")
    heuristic_result = legacy_heuristic_analysis(suspicious_claim)
    print(f"  - Fraud Score: {heuristic_result['fraud_score']}/100")
    print(f"  - Risk Level: {heuristic_result['risk_level']}")
    print(f"  - Indicators: {', '.join(heuristic_result['fraud_indicators'])}")
    print(f"  - Reasoning: {heuristic_result['reasoning']}")
    print()
    
    # AI Analysis
    print("AI-POWERED ANALYSIS:")
    print("  (Analyzing with OpenAI GPT-4...)")
    ai_result = ai_service.analyze_claim(suspicious_claim)
    print(f"  - Fraud Score: {ai_result['fraud_score']:.2f}/100")
    print(f"  - Risk Level: {ai_result['risk_level']}")
    print(f"  - Confidence: {ai_result['confidence']:.2f}%")
    print(f"  - Indicators Found: {len(ai_result['fraud_indicators'])}")
    for i, indicator in enumerate(ai_result['fraud_indicators'][:5], 1):
        print(f"    {i}. {indicator}")
    if len(ai_result['fraud_indicators']) > 5:
        print(f"    ... and {len(ai_result['fraud_indicators']) - 5} more")
    print(f"\n  AI Reasoning:")
    print(f"  {ai_result['reasoning'][:300]}...")
    print()
    
    # Test Case 2: Legitimate claim
    print("\n" + "=" * 80)
    print("TEST CASE 2: Legitimate Claim")
    print("-" * 80)
    
    legitimate_claim = {
        'claim_id': 'CLM-TEST-002',
        'claim_type': 'Auto Collision',
        'claim_amount': 8500,
        'incident_date': '2024-01-15',
        'filing_date': '2024-01-16',
        'policy_holder': 'Jane Smith',
        'policy_number': 'POL-789012',
        'policy_start_date': '2020-01-01',
        'previous_claims_count': 0,
        'years_as_customer': 4.0,
        'incident_location': 'Chicago, IL',
        'incident_description': 'Minor rear-end collision at red light, minor damage to bumper',
        'witnesses': 'Yes - two witnesses',
        'police_report_filed': 'Yes',
        'days_since_policy_start': 1461,
        'filing_delay_days': 1,
        'similar_claims_in_area': 2,
        'repair_provider': 'StateFarm Preferred Repair Shop'
    }
    
    print("\nClaim Details:")
    print(f"  - Claim ID: {legitimate_claim['claim_id']}")
    print(f"  - Amount: ${legitimate_claim['claim_amount']:,}")
    print(f"  - Years as customer: {legitimate_claim['years_as_customer']}")
    print(f"  - Police report: {legitimate_claim['police_report_filed']}")
    print(f"  - Witnesses: {legitimate_claim['witnesses']}")
    print()
    
    # Heuristic Analysis
    print("HEURISTIC ANALYSIS:")
    heuristic_result2 = legacy_heuristic_analysis(legitimate_claim)
    print(f"  - Fraud Score: {heuristic_result2['fraud_score']}/100")
    print(f"  - Risk Level: {heuristic_result2['risk_level']}")
    print(f"  - Indicators: {', '.join(heuristic_result2['fraud_indicators']) if heuristic_result2['fraud_indicators'] else 'None'}")
    print()
    
    # AI Analysis
    print("AI-POWERED ANALYSIS:")
    print("  (Analyzing with OpenAI GPT-4...)")
    ai_result2 = ai_service.analyze_claim(legitimate_claim)
    print(f"  - Fraud Score: {ai_result2['fraud_score']:.2f}/100")
    print(f"  - Risk Level: {ai_result2['risk_level']}")
    print(f"  - Confidence: {ai_result2['confidence']:.2f}%")
    if ai_result2['fraud_indicators']:
        print(f"  - Indicators Found: {len(ai_result2['fraud_indicators'])}")
        for i, indicator in enumerate(ai_result2['fraud_indicators'][:3], 1):
            print(f"    {i}. {indicator}")
    else:
        print(f"  - Indicators Found: None")
    print(f"\n  AI Reasoning:")
    print(f"  {ai_result2['reasoning'][:300]}...")
    print()
    
    # Summary
    print("\n" + "=" * 80)
    print("COMPARISON SUMMARY")
    print("=" * 80)
    print("\nKEY ADVANTAGES OF AI-POWERED ANALYSIS:")
    print("  ✓ Contextual understanding of claim details")
    print("  ✓ Nuanced fraud pattern detection")
    print("  ✓ Detailed explanations and reasoning")
    print("  ✓ Specific, actionable recommendations")
    print("  ✓ Confidence scoring for decision support")
    print("  ✓ Learns from new fraud patterns")
    print("  ✓ Reduces false positives")
    print("\nLIMITATIONS OF HEURISTIC APPROACH:")
    print("  ✗ Fixed, rigid rules")
    print("  ✗ No contextual understanding")
    print("  ✗ High false positive rate")
    print("  ✗ Cannot detect new fraud patterns")
    print("  ✗ Generic, non-specific indicators")
    print("  ✗ No confidence scoring")
    print()


def batch_analysis_demo():
    """Demonstrate batch analysis capability"""
    print("\n" + "=" * 80)
    print("BATCH ANALYSIS DEMONSTRATION")
    print("=" * 80)
    print()
    
    ai_service = FraudDetectionService()
    
    # Create batch of claims
    claims = [
        {
            'claim_id': f'CLM-BATCH-{i+1:03d}',
            'claim_type': 'Auto Collision',
            'claim_amount': 10000 + (i * 2000),
            'incident_date': '2024-01-15',
            'filing_date': '2024-01-20',
            'policy_holder': f'Customer {i+1}',
            'policy_number': f'POL-{100000+i}',
            'policy_start_date': '2023-01-01',
            'previous_claims_count': i % 3,
            'years_as_customer': 1.5,
            'incident_location': 'Various',
            'incident_description': f'Collision incident {i+1}',
            'witnesses': 'Yes' if i % 2 == 0 else 'No',
            'police_report_filed': 'Yes' if i % 3 == 0 else 'No',
            'days_since_policy_start': 365,
            'filing_delay_days': i * 2,
            'similar_claims_in_area': i,
            'repair_provider': 'Provider XYZ'
        }
        for i in range(5)
    ]
    
    print(f"Analyzing {len(claims)} claims...")
    results = ai_service.batch_analyze_claims(claims)
    
    print("\nBatch Results:")
    print("-" * 80)
    for result in results:
        print(f"  {result['claim_id']}: Score={result['fraud_score']:.1f}, Risk={result['risk_level']}")
    
    # Get summary
    summary = ai_service.get_insights_summary(results)
    print("\nSummary Statistics:")
    print("-" * 80)
    print(f"  Total Analyzed: {summary['total_claims_analyzed']}")
    print(f"  High Risk: {summary['high_risk_count']} ({summary['high_risk_percentage']:.1f}%)")
    print(f"  Medium Risk: {summary['medium_risk_count']}")
    print(f"  Low Risk: {summary['low_risk_count']}")
    print(f"  Average Fraud Score: {summary['average_fraud_score']:.2f}")
    print(f"  Average Confidence: {summary['average_confidence']:.2f}%")
    print()


if __name__ == "__main__":
    print("\n🚀 Starting StateFarm AI Fraud Detection Test Suite\n")
    
    try:
        # Run comparison
        compare_analyses()
        
        # Run batch demo
        batch_analysis_demo()
        
        print("=" * 80)
        print("✅ Test suite completed successfully!")
        print("=" * 80)
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        print("\nMake sure:")
        print("  1. Your .env file exists with a valid OPENAI_API_KEY")
        print("  2. You have internet connectivity")
        print("  3. All dependencies are installed (pip install -r requirements.txt)")
        print()
