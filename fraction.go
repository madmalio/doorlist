package main

import (
	"fmt"
	"math"
)

const fractionDenominator = 32

func FormatFraction(value float64) string {
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return "0"
	}

	negative := value < 0
	absValue := math.Abs(value)

	whole := int(math.Floor(absValue))
	numerator := int(math.Round((absValue - float64(whole)) * float64(fractionDenominator)))
	denominator := fractionDenominator

	if numerator == denominator {
		whole++
		numerator = 0
	}

	if numerator > 0 {
		gcdValue := gcd(numerator, denominator)
		numerator /= gcdValue
		denominator /= gcdValue
	}

	formatted := ""
	switch {
	case numerator == 0:
		formatted = fmt.Sprintf("%d", whole)
	case whole == 0:
		formatted = fmt.Sprintf("%d/%d", numerator, denominator)
	default:
		formatted = fmt.Sprintf("%d %d/%d", whole, numerator, denominator)
	}

	if negative && formatted != "0" {
		return "-" + formatted
	}

	return formatted
}

func gcd(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	if a < 0 {
		return -a
	}
	return a
}
