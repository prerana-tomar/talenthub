import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './OnboardingModal.css';

const STEPS = [
  {
    id: 1,
    icon: '🚀',
    title: 'Welcome to TalentHub',
    description: "Discover India's premier stage for creators & performers.",
    detail: 'Watch trending talent, connect with artists, and showcase your skills to a nationwide audience.',
    badge: 'STEP 1 OF 5',
  },
  {
    id: 2,
    icon: '🎬',
    title: 'Upload Your Talent',
    description: 'Publish music, dance, poetry, or acting clips in seconds.',
    detail: 'Share your videos directly with custom thumbnails, tags, and category filters.',
    badge: 'STEP 2 OF 5',
  },
  {
    id: 3,
    icon: '🔍',
    title: 'Explore Creators',
    description: 'Connect with artists, send appreciations, and chat.',
    detail: 'React with Applause 👏, Loved It ❤️, Outstanding 🔥, or Inspiring 🌟 to support talent.',
    badge: 'STEP 3 OF 5',
  },
  {
    id: 4,
    icon: '🏆',
    title: 'Competitions & Collaborations',
    description: 'Participate in active contests and form creative teams.',
    detail: 'Partner with fellow performers, win active contests, and gain national recognition.',
    badge: 'STEP 4 OF 5',
  },
  {
    id: 5,
    icon: '🌟',
    title: 'Grow Your Audience',
    description: 'Earn performer badges, build your fanbase, and shine.',
    detail: 'Unlock automatic performer badges, track your view metrics, and climb the leaderboard!',
    badge: 'STEP 5 OF 5',
  },
];

export default function OnboardingModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = STEPS[currentStep];

  const variants = {
    enter: (dir) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.35,
        ease: [0.34, 1.56, 0.64, 1],
      },
    },
    exit: (dir) => ({
      x: dir < 0 ? 80 : -80,
      opacity: 0,
      scale: 0.95,
      transition: {
        duration: 0.25,
        ease: 'easeInOut',
      },
    }),
  };

  return (
    <div className="onboarding-overlay" onClick={onClose}>
      <motion.div
        className="onboarding-card"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 30 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Background Glowing Orb */}
        <div className="onboarding-glow-orb" />

        {/* Top Header */}
        <div className="onboarding-header">
          <span className="onboarding-badge">{step.badge}</span>
          <button className="onboarding-close-btn" onClick={onClose} aria-label="Close tour">
            ✕
          </button>
        </div>

        {/* Step Progress Line */}
        <div className="onboarding-progress-track">
          <div
            className="onboarding-progress-bar"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Animated Step Content */}
        <div className="onboarding-body">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={step.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="onboarding-step-content"
            >
              <div className="onboarding-icon-wrap">
                <span className="onboarding-icon">{step.icon}</span>
              </div>
              <h2 className="onboarding-title">{step.title}</h2>
              <p className="onboarding-desc">{step.description}</p>
              <p className="onboarding-detail">{step.detail}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Step Indicator Dots */}
        <div className="onboarding-dots">
          {STEPS.map((s, index) => (
            <button
              key={s.id}
              className={`onboarding-dot ${index === currentStep ? 'active' : ''}`}
              onClick={() => {
                setDirection(index > currentStep ? 1 : -1);
                setCurrentStep(index);
              }}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="onboarding-footer">
          <button
            className="onboarding-btn secondary"
            onClick={currentStep === 0 ? onClose : handlePrev}
          >
            {currentStep === 0 ? 'Skip' : 'Previous'}
          </button>

          <button className="onboarding-btn primary" onClick={handleNext}>
            {currentStep === STEPS.length - 1 ? 'Get Started 🚀' : 'Next →'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
