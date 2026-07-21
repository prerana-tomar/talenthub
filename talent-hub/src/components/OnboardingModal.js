import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './OnboardingModal.css';

const STEPS = [
  {
    id: 1,
    icon: '🚀',
    title: 'Welcome to TalentHub',
    description: "India's premier stage for creators, performers, and artists.",
    detail: 'Whether you are a singer, dancer, comedian, rapper, or poet, Talent Hub is your digital stage. Explore performances, support other artists, climb the Leaderboard, and win popular Competitions!',
    badge: 'STEP 1 OF 5',
  },
  {
    id: 2,
    icon: '🎬',
    title: 'Upload Your Talent',
    description: 'Showcase your performance in simple steps.',
    detail: "Click on 'Upload' in the navigation bar. Put a catchy Title, select a Category (e.g. Singing, Rap, Art), choose your video file (up to 50MB), and click 'Publish'. Your video will immediately show up on the Explore page!",
    badge: 'STEP 2 OF 5',
  },
  {
    id: 3,
    icon: '🔍',
    title: 'Explore Creators & Thoughts',
    description: 'Express yourself and support other artists.',
    detail: "React with Applause 👏, Loved It ❤️, Outstanding 🔥, or Inspiring 🌟 on videos. Write shayari/poetry in Thoughts and use the new share options to direct message contacts!",
    badge: 'STEP 3 OF 5',
  },
  {
    id: 4,
    icon: '🏆',
    title: 'Join Competitions & Collaborations',
    description: 'Work with creators and win big prizes.',
    detail: "Go to Collab Hub to post collaboration requests or chat with potential partners. Participate in active Competitions by uploading your category video to win titles and shine on India's Stage!",
    badge: 'STEP 4 OF 5',
  },
  {
    id: 5,
    icon: '🌟',
    title: 'Grow Your Audience',
    description: 'Earn performer badges, build your fanbase, and shine.',
    detail: 'Unlock automatic performer badges (First Upload, 100 Views, 7-Day Active Streak), track your metrics, and climb to the top of the Leaderboard!',
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
