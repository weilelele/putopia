import type { WorldflowState } from '@/lib/actions/worldflow'

type SubmissionAsset = {
  character_id: string | null
  media_type: 'image' | 'video'
  shot_id: string | null
}

export function validateWorldflowSubmission(
  step: number,
  state: WorldflowState,
  assets: SubmissionAsset[],
) {
  if (step === 3) {
    const missingShots = state.shots.filter((shot) => !assets.some((asset) => (
      asset.shot_id === shot.id && asset.media_type === 'image'
    )))
    if (missingShots.length) {
      return `请先为这些镜头添加至少一张图片：${missingShots.map((shot) => shot.name || '未命名镜头').join('、')}`
    }
  }

  if (step === 4 && state.stepStatuses['4'] !== 'skipped' && state.characters.length) {
    const incompleteCharacters = state.characters.filter((character) => (
      !character.name.trim() || !character.description.trim()
    ))
    if (incompleteCharacters.length) {
      return '每个角色都需要填写角色名称和角色描述。'
    }

    const missingImages = state.characters.filter((character) => !assets.some((asset) => (
      asset.character_id === character.id && asset.media_type === 'image'
    )))
    if (missingImages.length) {
      return `请先为这些角色添加形象图片：${missingImages.map((character) => character.name || '未命名角色').join('、')}`
    }
  }

  return null
}
