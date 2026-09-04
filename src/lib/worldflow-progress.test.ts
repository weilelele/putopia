import { describe, expect, it } from 'vitest'
import { worldflowProgressAfterSave } from './worldflow-progress'

describe('worldflowProgressAfterSave', () => {
  it('does not regress an unlocked workflow when an earlier step is edited', () => {
    expect(worldflowProgressAfterSave({
      currentStatus: 'draft',
      currentStep: 6,
      editedStatus: 'approved',
      editedStep: 3,
    })).toEqual({ currentStatus: 'draft', currentStep: 6 })
  })

  it('updates the displayed status when the current step is saved', () => {
    expect(worldflowProgressAfterSave({
      currentStatus: 'draft',
      currentStep: 6,
      editedStatus: 'changes',
      editedStep: 6,
    })).toEqual({ currentStatus: 'changes', currentStep: 6 })
  })
})
