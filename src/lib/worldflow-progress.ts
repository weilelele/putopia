export function canEditWorldflowMilestone(input: {
  activeStep: number
  currentStep: number
  isOwner: boolean
  status: string
}) {
  return (
    input.isOwner &&
    input.activeStep <= input.currentStep &&
    input.status !== 'review'
  )
}

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
