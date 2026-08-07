import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './OnboardingTour.css';

export default function OnboardingTour({ steps, run, onClose, onStepChange }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, isAbove: false });
  const tooltipRef = useRef(null);

  // Trigger onStepChange callback
  useEffect(() => {
    if (run && onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, run, onStepChange]);

  // Reset step to 0 when tour starts running
  useEffect(() => {
    if (run) {
      setCurrentStep(0);
    }
  }, [run]);

  // Find target element and measure its dimensions
  useEffect(() => {
    if (!run || !steps || steps.length === 0) return;

    const step = steps[currentStep];
    let el = document.querySelector(step.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        el = null; // treat as hidden/not found
      }
    }

    // Fallback: search by text content if selector is not found or hidden
    if (!el && step.fallbackText) {
      el = Array.from(document.querySelectorAll('a, button, span, div, strong')).find(node =>
        node.textContent.trim().toLowerCase().includes(step.fallbackText.toLowerCase()) &&
        node.getBoundingClientRect().width > 0 &&
        node.getBoundingClientRect().height > 0
      );
    }

    if (!el) {
      setRect(null);
      const updateCenteredPos = () => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const left = Math.max(16, Math.min(w - 336, w / 2 - 160));
        setTooltipPos({
          top: h / 2 - 80,
          left: left,
          isAbove: false,
          isCentered: true
        });
      };
      updateCenteredPos();
      window.addEventListener('resize', updateCenteredPos);
      return () => {
        window.removeEventListener('resize', updateCenteredPos);
      };
    }

    // Scroll target element into view smoothly
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const updateRect = () => {
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);

        // Calculate tooltip position based on target rect and viewport height
        const tooltipWidth = 320;
        const tooltipHeight = 130; // approximate estimation
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // If target is in the bottom half of viewport, place tooltip above it
        const isAbove = r.top > viewportHeight / 2;
        let top = isAbove ? r.top - tooltipHeight - 35 : r.bottom + 35;
        
        // Horizontal centering with screen margins clamping
        let left = r.left + r.width / 2 - tooltipWidth / 2;
        left = Math.max(16, Math.min(viewportWidth - tooltipWidth - 16, left));

        setTooltipPos({ top, left, isAbove, isCentered: false });
      }
    };

    // Delay briefly to allow scrollIntoView and drawer transitions to complete
    const timer1 = setTimeout(updateRect, 150);
    const timer2 = setTimeout(updateRect, 450);

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [currentStep, run, steps]);

  if (!run || !steps || steps.length === 0) return null;

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Calculate coordinates for curved SVG arrow
  const getArrowPath = () => {
    if (!rect) return '';
    const tooltipWidth = 320;
    const tooltipHeight = 120; // approximate
    const targetX = rect.left + rect.width / 2;
    const targetY = tooltipPos.isAbove ? rect.top : rect.bottom;

    const tooltipX = tooltipPos.left + tooltipWidth / 2;
    const tooltipY = tooltipPos.isAbove ? tooltipPos.top + tooltipHeight : tooltipPos.top;

    // Control point to give it a nice Swiggy-style curved loop look
    const dx = targetX - tooltipX;
    const dy = targetY - tooltipY;
    const cx = tooltipX + dx * 0.1;
    const cy = tooltipY + dy * 0.9;

    return `M ${tooltipX} ${tooltipY} Q ${cx} ${cy} ${targetX} ${targetY}`;
  };

  return (
    <div className="th-tour-overlay">
      <AnimatePresence mode="wait">
        {/* If target exists, show spotlight cutout. If not, show full-screen overlay */}
        {rect ? (
          <motion.div
            key={`highlight-${currentStep}`}
            className="th-tour-spotlight"
            initial={{
              opacity: 0,
              x: rect.left - 4,
              y: rect.top - 4,
              width: rect.width + 8,
              height: rect.height + 8,
            }}
            animate={{
              opacity: 1,
              x: rect.left - 4,
              y: rect.top - 4,
              width: rect.width + 8,
              height: rect.height + 8,
              transition: { duration: 0.3, ease: 'easeOut' }
            }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              borderRadius: '8px',
              border: '2px solid #a855f7',
              boxShadow: '0 0 15px #a855f7, 0 0 0 9999px rgba(5, 5, 12, 0.75)',
              zIndex: 1000000,
              pointerEvents: 'none',
            }}
          />
        ) : (
          <motion.div
            key={`full-overlay-${currentStep}`}
            className="th-tour-full-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              background: 'rgba(5, 5, 12, 0.75)',
              zIndex: 1000000,
              pointerEvents: 'auto',
            }}
          />
        )}

        {/* Global SVG Arrow - only render when target exists */}
        {rect && (
          <svg
            className="th-tour-arrow-svg"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none',
              zIndex: 1000001,
            }}
          >
            <defs>
              <marker
                id="tour-arrowhead"
                viewBox="0 0 10 10"
                refX="3"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#f472b6" />
              </marker>
            </defs>
            <motion.path
              key={`arrow-${currentStep}`}
              d={getArrowPath()}
              fill="none"
              stroke="#f472b6"
              strokeWidth="3.5"
              strokeDasharray="8 4"
              strokeLinecap="round"
              markerEnd="url(#tour-arrowhead)"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </svg>
        )}

        {/* Tooltip Card */}
        <motion.div
          ref={tooltipRef}
          key={`tooltip-${currentStep}`}
          className="th-tour-tooltip"
          initial={{ opacity: 0, y: tooltipPos.isAbove ? 10 : -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            zIndex: 1000002,
          }}
        >
          <div className="th-tour-tooltip-content">
            <span className="th-tour-step-badge">💡 STEP {currentStep + 1} OF {steps.length}</span>
            <p className="th-tour-instruction">{currentStepData.text}</p>
          </div>

          <div className="th-tour-tooltip-footer">
            <button className="th-tour-btn-skip" onClick={onClose}>
              Skip
            </button>

            <div className="th-tour-footer-right">
              {currentStep > 0 && (
                <button className="th-tour-btn-prev" onClick={handlePrev}>
                  Back
                </button>
              )}
              <button className="th-tour-btn-next" onClick={handleNext}>
                {currentStep === steps.length - 1 ? 'Got it 👍' : 'Next →'}
              </button>
            </div>
          </div>

          <div className="th-tour-dots">
            {steps.map((_, idx) => (
              <span
                key={idx}
                className={`th-tour-dot ${idx === currentStep ? 'active' : ''}`}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
