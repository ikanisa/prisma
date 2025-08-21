import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../enhanced-button'

describe('Enhanced Button', () => {
  it('renders correctly', () => {
    const { getByRole, getByText } = render(<Button>Click me</Button>)
    expect(getByRole('button')).toBeInTheDocument()
    expect(getByText('Click me')).toBeInTheDocument()
  })

  it('applies variant styles correctly', () => {
    const { getByRole } = render(<Button variant="outline">Outline Button</Button>)
    const button = getByRole('button')
    expect(button).toHaveClass('border-input')
  })

  it('handles click events', () => {
    const handleClick = vi.fn()
    const { getByRole } = render(<Button onClick={handleClick}>Clickable</Button>)
    
    getByRole('button').click()
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})