export function worldflowMaterialMutationError(input: {
  currentStep: number
  status: string
  step: number
}) {
  if (input.step > input.currentStep) {
    return '请先完成当前步骤的审核。'
  }

  const continuingShotEdit = input.step === 3 && input.currentStep >= 5
  if (input.step < 5 && !continuingShotEdit && input.status === 'review') {
    return '当前步骤正在审核，暂时不能修改素材。'
  }

  return null
}
