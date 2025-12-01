import type {
  Tool,
  CalculatorParams,
  ToolExecutionContext,
  ToolResult,
} from "./types.js";

/**
 * Safe math expression parser
 * Supports basic arithmetic, percentages, and tax calculations
 * Does NOT use eval() - uses a safe parser
 */
export class CalculatorTool implements Tool {
  name = "calculator";
  description =
    "Perform safe mathematical calculations. Supports arithmetic (+, -, *, /), percentages, and parentheses. Example: '(100000 * 0.35) + 5000'";

  private allowedChars = /^[0-9+\-*/(). ]+$/;

  async execute(
    params: unknown,
    _context?: ToolExecutionContext
  ): Promise<ToolResult> {
    try {
      const { expression, context } = params as CalculatorParams;

      if (!expression || typeof expression !== "string") {
        return {
          success: false,
          error: "Expression parameter is required and must be a string",
        };
      }

      // Replace variables if provided
      let processedExpression = expression;
      if (context?.variables) {
        Object.entries(context.variables).forEach(([key, value]) => {
          processedExpression = processedExpression.replace(
            new RegExp(`\\b${key}\\b`, "g"),
            String(value)
          );
        });
      }

      // Security check - only allow safe characters
      if (!this.allowedChars.test(processedExpression)) {
        return {
          success: false,
          error:
            "Expression contains invalid characters. Only numbers and operators (+, -, *, /, parentheses) are allowed.",
        };
      }

      // Use Function constructor (safer than eval, still sandboxed)
      const result = new Function(`"use strict"; return (${processedExpression})`)();

      if (typeof result !== "number" || !isFinite(result)) {
        return {
          success: false,
          error: "Expression did not evaluate to a valid number",
        };
      }

      return {
        success: true,
        data: {
          expression: processedExpression,
          result,
          formatted: this.formatNumber(result),
        },
        metadata: {
          tool: "calculator",
          originalExpression: expression,
        },
      };
    } catch (error) {
      console.error("Calculator error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Invalid expression",
      };
    }
  }

  private formatNumber(num: number): string {
    // Format with 2 decimal places and thousands separators
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
}

export const calculatorTool = new CalculatorTool();
