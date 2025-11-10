import { useEffect, useState } from "react";
import type { TutorialStep } from "../domain/tutorial";

type TutorialOverlayProps = {
  step: TutorialStep;
  onNext: () => void;
  onSkip: () => void;
};

export default function TutorialOverlay({
  step,
  onNext,
  onSkip,
}: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const findTarget = () => {
      try {
        const element = document.querySelector(step.target);
        if (element) {
          setTargetRect(element.getBoundingClientRect());
        } else {
          setTargetRect(null);
        }
      } catch (e) {
        console.warn(`Tutorial target not found: ${step.target}`, e);
        setTargetRect(null);
      }
    };

    const timerId = setTimeout(findTarget, 100);

    window.addEventListener("resize", findTarget);
    return () => {
      clearTimeout(timerId);
      window.removeEventListener("resize", findTarget);
    };
  }, [step.target, step.id]);

  const getPopoverPosition = () => {
    if (!targetRect)
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };

    switch (step.position) {
      case "top":
        return {
          bottom: `${window.innerHeight - targetRect.top + 16}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          top: `${targetRect.bottom + 16}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          right: `${window.innerWidth - targetRect.left + 16}px`,
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + 16}px`,
          transform: "translateY(-50%)",
        };
      default:
        return {
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        };
    }
  };

  const isActionStep = !!step.action;
  const boxPadding = 8;

  return (
    <div className="fixed inset-0 z-1000 pointer-events-none">
      {/* Mask parts */}
      {targetRect && (
        <>
          {/* Top */}
          <div
            className="fixed bg-black/70 pointer-events-auto"
            style={{
              left: 0,
              top: 0,
              width: "100%",
              height: `${targetRect.top - boxPadding}px`,
            }}
          />
          {/* Bottom */}
          <div
            className="fixed bg-black/70 pointer-events-auto"
            style={{
              left: 0,
              top: `${targetRect.bottom + boxPadding}px`,
              width: "100%",
              bottom: 0,
            }}
          />
          {/* Left */}
          <div
            className="fixed bg-black/70 pointer-events-auto"
            style={{
              left: 0,
              top: `${targetRect.top - boxPadding}px`,
              width: `${targetRect.left - boxPadding}px`,
              height: `${targetRect.height + boxPadding * 2}px`,
            }}
          />
          {/* Right */}
          <div
            className="fixed bg-black/70 pointer-events-auto"
            style={{
              left: `${targetRect.right + boxPadding}px`,
              top: `${targetRect.top - boxPadding}px`,
              right: 0,
              height: `${targetRect.height + boxPadding * 2}px`,
            }}
          />
        </>
      )}
      {/* Full mask if no target */}
      {!targetRect && (
        <div className="fixed inset-0 bg-black/70 pointer-events-auto" />
      )}

      {/* Popover with instructions */}
      <div
        className="absolute p-4 rounded-lg border-2 border-yellow-500 bg-zinc-800 shadow-2xl w-80 pointer-events-auto transition-all duration-300 ease-in-out"
        style={getPopoverPosition()}
      >
        <h3 className="text-lg font-bold text-yellow-400 mb-2">{step.title}</h3>
        <p
          className="text-sm text-zinc-200 mb-4"
          dangerouslySetInnerHTML={{ __html: step.description }}
        />
        <div className="flex justify-end gap-2">
          {step.optional && (
            <button
              onClick={onSkip}
              className="px-3 py-1 text-xs rounded bg-zinc-700 hover:bg-zinc-600"
            >
              Passer le tutoriel
            </button>
          )}
          {!isActionStep && (
            <button
              onClick={onNext}
              className="px-4 py-1 text-sm font-bold rounded bg-yellow-600 hover:bg-yellow-500"
            >
              Suivant
            </button>
          )}
        </div>
        {isActionStep && (
          <div className="text-xs text-yellow-300/80 italic mt-2">
            Effectuez l'action demandée pour continuer.
          </div>
        )}
      </div>
    </div>
  );
}
