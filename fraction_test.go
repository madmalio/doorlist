package main

import "testing"

func TestFormatFraction(t *testing.T) {
	tests := []struct {
		name  string
		value float64
		want  string
	}{
		{name: "whole", value: 12, want: "12"},
		{name: "simple fraction", value: 0.5, want: "1/2"},
		{name: "thirty second precision", value: -3.0 / 32.0, want: "-3/32"},
		{name: "mixed number", value: 15.5, want: "15 1/2"},
		{name: "nearest thirty second", value: 30.531, want: "30 17/32"},
		{name: "round up next whole", value: 7.999, want: "8"},
		{name: "negative", value: -2.125, want: "-2 1/8"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := FormatFraction(tt.value); got != tt.want {
				t.Fatalf("FormatFraction(%v) = %q, want %q", tt.value, got, tt.want)
			}
		})
	}
}
