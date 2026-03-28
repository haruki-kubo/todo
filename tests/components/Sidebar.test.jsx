import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import Sidebar from '../../src/components/Sidebar.jsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Sidebar', () => {
  test('renders navigation items and add button', () => {
    render(<Sidebar activeView="issues" onViewChange={() => {}} onAdd={() => {}} />)

    expect(screen.getByRole('button', { name: /^📋課題$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^📊ボード$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^📅ガントチャート$/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ 課題を追加' })).toBeInTheDocument()
  })

  test('calls onViewChange and onAdd when buttons are clicked', async () => {
    const user = userEvent.setup()
    const onViewChange = vi.fn()
    const onAdd = vi.fn()

    render(<Sidebar activeView="issues" onViewChange={onViewChange} onAdd={onAdd} />)

    await user.click(screen.getByRole('button', { name: /^📊ボード$/ }))
    await user.click(screen.getByRole('button', { name: '+ 課題を追加' }))

    expect(onViewChange).toHaveBeenCalledWith('board')
    expect(onAdd).toHaveBeenCalled()
  })
})
