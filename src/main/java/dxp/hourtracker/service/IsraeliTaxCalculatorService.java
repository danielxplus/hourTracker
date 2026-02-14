package dxp.hourtracker.service;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Israeli Net Salary Calculator (2026 Edition).
 *
 * Calculates:
 * - Income Tax (Mas Hachnasa) using 2026 brackets
 * - Credit Points (Nekudot Zikuy) including ex-soldier benefits
 * - Bituach Leumi + Health Tax (employee portion, 2026 rates)
 * - Pension (6%) and Keren Hishtalmut (2.5%) deductions
 */
@Component
public class IsraeliTaxCalculatorService {

    // === 2026 Constants ===
    private static final double CREDIT_POINT_VALUE = 242.0; // NIS per month

    // Base credit points
    private static final double BASE_CREDIT_POINTS_MALE = 2.25;
    private static final double BASE_CREDIT_POINTS_FEMALE = 2.75;

    // Ex-soldier extra credit points (within 36 months of discharge)
    private static final double EX_SOLDIER_EXTRA_POINTS = 2.0; // Combat soldiers
    private static final long SOLDIER_BENEFIT_MONTHS = 36;

    // Bituach Leumi + Health Tax (Employee portion, 2026)
    private static final double BL_REDUCED_THRESHOLD = 7703.0; // 60% of average wage
    private static final double BL_REDUCED_RATE = 0.0427; // 4.27% (1.04% NI + 3.23% Health)
    private static final double BL_FULL_RATE = 0.1217; // 12.17% (7% NI + 5.17% Health)

    // Pension & Study Fund
    private static final double PENSION_RATE = 0.06; // 6% employee
    private static final double STUDY_FUND_RATE = 0.025; // 2.5% employee

    // 2026 Monthly Income Tax Brackets (from Israeli Tax Authority)
    private static final double[][] TAX_BRACKETS = {
            { 7010, 0.10 }, // 10% on first ₪7,010
            { 10060, 0.14 }, // 14% on ₪7,011 – ₪10,060
            { 19000, 0.20 }, // 20% on ₪10,061 – ₪19,000 (2026 expanded bracket)
            { 25100, 0.31 }, // 31% on ₪19,001 – ₪25,100
            { 46690, 0.35 }, // 35% on ₪25,101 – ₪46,690
            { Double.MAX_VALUE, 0.47 } // 47% above ₪46,690
    };

    /**
     * Calculates a detailed net salary breakdown.
     *
     * @param grossMonthlySalary The total gross monthly salary.
     * @param paysTax            Whether the user pays income tax.
     * @param pensionEnabled     Whether pension is deducted.
     * @param studyFundEnabled   Whether study fund is deducted.
     * @param isFemale           For credit point calculation.
     * @param isExSoldier        Whether user is an ex-soldier.
     * @param dischargeDate      Date of discharge (for 36-month window).
     * @return A map with all breakdown fields.
     */
    public Map<String, Object> calculateNetSalary(
            double grossMonthlySalary,
            boolean paysTax,
            boolean pensionEnabled,
            boolean studyFundEnabled,
            boolean isFemale,
            boolean isExSoldier,
            LocalDate dischargeDate) {

        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("grossSalary", round(grossMonthlySalary));

        double totalDeductions = 0;

        // 1. Pension
        double pensionDeduction = 0;
        if (pensionEnabled) {
            pensionDeduction = grossMonthlySalary * PENSION_RATE;
            totalDeductions += pensionDeduction;
        }
        breakdown.put("pensionDeduction", round(pensionDeduction));

        // 2. Study Fund (Keren Hishtalmut)
        double studyFundDeduction = 0;
        if (studyFundEnabled) {
            studyFundDeduction = grossMonthlySalary * STUDY_FUND_RATE;
            totalDeductions += studyFundDeduction;
        }
        breakdown.put("studyFundDeduction", round(studyFundDeduction));

        // 3. Bituach Leumi + Health Tax
        double bituachLeumi = calculateBituachLeumi(grossMonthlySalary);
        totalDeductions += bituachLeumi;
        breakdown.put("bituachLeumiDeduction", round(bituachLeumi));

        // 4. Income Tax
        double incomeTax = 0;
        if (paysTax) {
            // Calculate gross tax from brackets
            double grossTax = calculateIncomeTax(grossMonthlySalary);

            // Calculate credit points discount
            double creditPoints = calculateCreditPoints(isFemale, isExSoldier, dischargeDate);
            double creditDiscount = creditPoints * CREDIT_POINT_VALUE;

            // Net tax = gross tax minus credit points (never negative)
            incomeTax = Math.max(0, grossTax - creditDiscount);

            breakdown.put("creditPoints", creditPoints);
            breakdown.put("creditDiscount", round(creditDiscount));
        } else {
            breakdown.put("creditPoints", 0.0);
            breakdown.put("creditDiscount", 0.0);
        }
        totalDeductions += incomeTax;
        breakdown.put("incomeTaxDeduction", round(incomeTax));

        // Final
        double netSalary = grossMonthlySalary - totalDeductions;
        breakdown.put("totalDeductions", round(totalDeductions));
        breakdown.put("netSalary", round(netSalary));

        return breakdown;
    }

    /** Calculates income tax using 2026 progressive brackets. */
    private double calculateIncomeTax(double grossSalary) {
        double tax = 0;
        double previousCeiling = 0;

        for (double[] bracket : TAX_BRACKETS) {
            double ceiling = bracket[0];
            double rate = bracket[1];

            if (grossSalary <= previousCeiling)
                break;

            double taxableInBracket = Math.min(grossSalary, ceiling) - previousCeiling;
            tax += taxableInBracket * rate;
            previousCeiling = ceiling;
        }
        return tax;
    }

    /** Calculates Bituach Leumi + Health Tax (employee portion). */
    private double calculateBituachLeumi(double grossSalary) {
        if (grossSalary <= BL_REDUCED_THRESHOLD) {
            return grossSalary * BL_REDUCED_RATE;
        }
        double reducedPart = BL_REDUCED_THRESHOLD * BL_REDUCED_RATE;
        double fullPart = (grossSalary - BL_REDUCED_THRESHOLD) * BL_FULL_RATE;
        return reducedPart + fullPart;
    }

    /** Calculates total credit points based on gender and ex-soldier status. */
    private double calculateCreditPoints(boolean isFemale, boolean isExSoldier, LocalDate dischargeDate) {
        double points = isFemale ? BASE_CREDIT_POINTS_FEMALE : BASE_CREDIT_POINTS_MALE;

        if (isExSoldier && dischargeDate != null) {
            long monthsSinceDischarge = ChronoUnit.MONTHS.between(dischargeDate, LocalDate.now());
            if (monthsSinceDischarge >= 0 && monthsSinceDischarge <= SOLDIER_BENEFIT_MONTHS) {
                points += EX_SOLDIER_EXTRA_POINTS;
            }
        }

        return points;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
