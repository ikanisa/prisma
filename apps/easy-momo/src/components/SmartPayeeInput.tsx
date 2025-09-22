
import React, { useState, useEffect } from "react";

type PayeeType = "phone" | "code" | "invalid" | null;

interface SmartPayeeInputProps {
  value: string;
  onChange: (value: string, type: PayeeType, valid: boolean) => void;
  label?: string;
}

const phoneRegex = /^(07[2-9]\d{7})$/;
const codeRegex = /^\d{4,6}$/;

function detectPayeeType(payee: string): PayeeType {
  if (phoneRegex.test(payee)) return "phone";
  if (codeRegex.test(payee) && !/^07/.test(payee)) return "code";
  if (payee) return "invalid";
  return null;
}

export function SmartPayeeInput({
  value,
  onChange,
  label = "MoMo Phone or MoMo Code",
}: SmartPayeeInputProps) {
  const [input, setInput] = useState(value);
  const [type, setType] = useState<PayeeType>(null);
  const [valid, setValid] = useState(false);

  useEffect(() => {
    setInput(value);
    const detectedType = detectPayeeType(value);
    setType(detectedType);

    let isValid = false;
    if (detectedType === "phone") isValid = true;
    if (detectedType === "code") isValid = true;
    setValid(isValid);

    onChange(value, detectedType, isValid);
    // eslint-disable-next-line
  }, [value]);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/\s+/g, "");
    setInput(val);
    const detectedType = detectPayeeType(val);
    setType(detectedType);

    let isValid = false;
    if (detectedType === "phone") isValid = true;
    if (detectedType === "code") isValid = true;
    setValid(isValid);

    onChange(val, detectedType, isValid);
  }

  let helper = "";
  if (type === "phone") helper = "Detected: MoMo Phone Number";
  else if (type === "code") helper = "Detected: MoMo Pay Code";
  else if (type === "invalid" && input) helper = "Invalid. Enter MoMo phone (07...) or MoMo Code (4-6 digits)";
  else helper = "Enter MoMo phone (e.g. 0788...) or Pay Code (e.g. 12345)";

  return (
    <div className="space-y-2">
      <label className="font-semibold text-gray-700 dark:text-gray-200">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        maxLength={11}
        value={input}
        onChange={handleInput}
        placeholder="07XXXXXXXX or 12345"
        className={`w-full mobile-input text-center text-xl py-3 font-bold rounded-lg shadow ${type === "invalid" ? "border-red-500 focus:ring-red-500/20" : ""}`}
        style={{
          caretColor: type === "invalid" ? '#ef4444' : '#16a34a',
          color: 'inherit',
          WebkitUserSelect: 'text',
          userSelect: 'text',
          pointerEvents: 'auto',
          WebkitTapHighlightColor: 'transparent'
        }}
        aria-invalid={type === "invalid"}
      />
      <div className={`text-sm ${type === "invalid" ? "text-red-500" : "text-green-700"}`}>
        {helper}
      </div>
    </div>
  );
}

export default SmartPayeeInput;
