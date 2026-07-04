import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { getExerciseMedia } from '@/lib/exerciseMedia'

type ExerciseInfoModalProps = {
  open: boolean
  onClose: () => void
  exerciseName: string
}

export function ExerciseInfoModal({ open, onClose, exerciseName }: ExerciseInfoModalProps) {
  const media = getExerciseMedia(exerciseName)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={exerciseName}
      description={media ? 'Start → end demo' : undefined}
    >
      {media ? (
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-xl bg-white">
            <img
              src={media.frames[0]}
              alt={`${exerciseName} start position`}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-contain"
            />
            <img
              src={media.frames[1]}
              alt={`${exerciseName} end position`}
              loading="lazy"
              className="exdemo-crossfade absolute inset-0 h-full w-full object-contain"
            />
          </div>

          {media.primaryMuscles.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {media.primaryMuscles.map((muscle) => (
                <Badge key={muscle} variant="primary" className="capitalize">
                  {muscle}
                </Badge>
              ))}
            </div>
          ) : null}

          {media.instructions.length > 0 ? (
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-[var(--color-fg)]">
              {media.instructions.map((step, i) => (
                <li key={i} className="pl-1 leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          ) : null}

          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            No demo available for this exercise.
          </p>
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      )}
    </Modal>
  )
}
