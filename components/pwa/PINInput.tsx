'use client'

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PINInputProps {
  length?: number
  onComplete: (pin: string) => void
  onCancel?: () => void
  error?: string | null
  disabled?: boolean
  autoFocus?: boolean
  showToggle?: boolean  // Show visibility toggle
}

export function PINInput({
  length = 6,
  onComplete,
  onCancel,
  error,
  disabled = false,
  autoFocus = true,
  showToggle = true,
}: PINInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''))
  const [showPIN, setShowPIN] = useState(true) // Show by default for better UX
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [autoFocus])

  // Clear on error change
  useEffect(() => {
    if (error) {
      setValues(Array(length).fill(''))
      inputRefs.current[0]?.focus()
    }
  }, [error, length])

  const handleChange = (index: number, value: string) => {
    // Only accept digits
    if (value && !/^\d$/.test(value)) return

    const newValues = [...values]
    newValues[index] = value
    setValues(newValues)

    // Move to next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Check if complete
    if (value && index === length - 1) {
      const pin = newValues.join('')
      if (pin.length === length) {
        onComplete(pin)
      }
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace - move to previous input
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
        const newValues = [...values]
        newValues[index - 1] = ''
        setValues(newValues)
      } else {
        const newValues = [...values]
        newValues[index] = ''
        setValues(newValues)
      }
    }

    // Arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Escape - cancel
    if (e.key === 'Escape' && onCancel) {
      onCancel()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)

    if (pastedData.length > 0) {
      const newValues = Array(length).fill('')
      pastedData.split('').forEach((char, i) => {
        newValues[i] = char
      })
      setValues(newValues)

      // Focus last filled or next empty
      const lastIndex = Math.min(pastedData.length, length - 1)
      inputRefs.current[lastIndex]?.focus()

      // Check if complete
      if (pastedData.length === length) {
        onComplete(pastedData)
      }
    }
  }

  // Get display value (number or dot)
  const getDisplayValue = (value: string): string => {
    if (!value) return ''
    return showPIN ? value : '•'
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:gap-4 w-full">
      <div className="flex gap-1.5 sm:gap-2 md:gap-3 justify-center w-full max-w-[280px] sm:max-w-none">
        {values.map((value, index) => (
          <div key={index} className="relative flex-1 sm:flex-none">
            {/* Hidden actual input */}
            <input
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={value}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              disabled={disabled}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label={`PIN digit ${index + 1}`}
            />
            {/* Visible display */}
            <div
              onClick={() => inputRefs.current[index]?.focus()}
              className={`
                w-full sm:w-11 md:w-12
                h-12 sm:h-14 md:h-16
                flex items-center justify-center
                text-xl sm:text-2xl font-bold
                bg-[#0a0c10] border-2 rounded-lg sm:rounded-xl
                cursor-pointer select-none
                transition-all
                ${error ? 'border-red-500 animate-shake' : 'border-[#1a1f2e]'}
                ${value ? 'border-accent/70 text-accent' : 'text-white/50'}
                ${focusedIndex === index ? 'border-accent ring-2 ring-accent/30' : ''}
              `}
            >
              {value ? (
                <span className="text-white">{getDisplayValue(value)}</span>
              ) : (
                <span className="text-white/20">–</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Visibility toggle */}
      {showToggle && (
        <button
          type="button"
          onClick={() => setShowPIN(!showPIN)}
          className="flex items-center gap-2 text-text-secondary text-xs hover:text-accent transition-colors"
        >
          {showPIN ? (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Hide PIN</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              <span>Show PIN</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-red-400 text-sm text-center animate-fade-in">
          {error}
        </p>
      )}

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
