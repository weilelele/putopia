export function worldflowProgressAfterSave<Status extends string>(input: {
  currentStatus: Status
  currentStep: number
  editedStatus: Status
  editedStep: number
}) {
  return {
    currentStatus:
      input.editedStep === input.currentStep
        ? input.editedStatus
        : input.currentStatus,
    currentStep: input.currentStep,
  }
}
