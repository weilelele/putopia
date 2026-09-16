import { describe, expect, it } from 'vitest'
import { canEditWorldflowMilestone, worldflowProgressAfterSave } from './worldflow-progress'

describe('canEditWorldflowMilestone', () => {
  it('keeps approved steps editable for their creator', () => {
    expect(canEditWorldflowMilestone({
      activeStep: 1,
      currentStep: 7,
      isOwner: true,
      status: 'approved',
    })).toBe(true)
  })

  it('keeps review steps and locked future steps read-only', () => {
    expect(canEditWorldflowMilestone({
      activeStep: 2,
      currentStep: 2,
      isOwner: true,
      status: 'review',
    })).toBe(false)
    expect(canEditWorldflowMilestone({
      activeStep: 3,
      currentStep: 2,
      isOwner: true,
      status: 'draft',
    })).toBe(false)
  })

  it('does not grant editing access to a non-owner', () => {
    expect(canEditWorldflowMilestone({
      activeStep: 1,
      currentStep: 7,
      isOwner: false,
      status: 'approved',
    })).toBe(false)
  })
})

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

  it('preserves approval when the current approved step is edited and saved', () => {
    expect(worldflowProgressAfterSave({
      currentStatus: 'approved',
      currentStep: 7,
      editedStatus: 'approved',
      editedStep: 7,
    })).toEqual({ currentStatus: 'approved', currentStep: 7 })
  })
})
