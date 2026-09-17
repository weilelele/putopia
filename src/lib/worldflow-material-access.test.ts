import { describe, expect, it } from 'vitest'
import { worldflowMaterialMutationError } from './worldflow-material-access'

describe('worldflowMaterialMutationError', () => {
  it.each([1, 2, 3, 4])(
    'allows the creator to keep changing materials after step %s is approved',
    (step) => {
      expect(
        worldflowMaterialMutationError({
          currentStep: 7,
          status: 'approved',
          step,
        }),
      ).toBeNull()
    },
  )

  it('keeps a milestone read-only while it is being reviewed', () => {
    expect(
      worldflowMaterialMutationError({
        currentStep: 2,
        status: 'review',
        step: 2,
      }),
    ).toBe('当前步骤正在审核，暂时不能修改素材。')
  })

  it('allows shot materials to remain editable in the ongoing production workspace', () => {
    expect(
      worldflowMaterialMutationError({
        currentStep: 6,
        status: 'review',
        step: 3,
      }),
    ).toBeNull()
  })

  it('rejects material changes for a step that has not been unlocked', () => {
    expect(
      worldflowMaterialMutationError({
        currentStep: 2,
        status: 'draft',
        step: 3,
      }),
    ).toBe('请先完成当前步骤的审核。')
  })
})
